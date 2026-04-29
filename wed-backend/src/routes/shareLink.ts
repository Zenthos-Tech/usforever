import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { buildSignedReadUrl, buildSignedReadUrls } from '../config/s3';
import { ShareLink } from '../models/ShareLink';
import { Album } from '../models/Album';
import { Wedding } from '../models/Wedding';
import { Photo } from '../models/Photo';
import { PasscodeAttempt } from '../models/PasscodeAttempt';
import { authRequired } from '../middleware/auth';
import { renderPage } from './shareLinkPage';
import {
  hashToken,
  buildSlug,
  isExpired,
  getPublicBase,
  buildAppUrl,
  buildExpoGo,
  buildIntent,
  buildPhotographerUrl,
  buildGuestWebUrl,
  signPhotoJwt,
  verifyPhotoJwt,
} from './shareLinkHelpers';

// Four sub-routers, one per public URL prefix. index.ts mounts each at its
// proper Express base path so we don't need the old `req.url` rewriting (which
// dropped repeated query params via URLSearchParams.toString()).
const router = Router();              // /api/share-links/{generate,resolve/:slug,/}
const shareGateRouter = Router();     // /api/s/:slug
const shareRedirectRouter = Router(); // /api/r
const sharePhotosRouter = Router();   // /api/share/photos

// ─── Passcode rate limiter (Mongo, TTL-backed) ───────────────────────────────
// Limits brute-force attempts against passcode-protected links. Backed by the
// PasscodeAttempt collection with a TTL on `resetAt`, so windows expire on
// their own. Two parallel counters:
//   • per-slug (PASSCODE_LIMIT = 10 / 2 min) — narrow, so a leaked URL can be
//     tried at most 10 times per window.
//   • per-IP   (PASSCODE_IP_LIMIT = 30 / 2 min) — broader cap so an attacker
//     can't roll through different slugs to amplify.
// Both counters are bumped regardless of slug validity, so probing for valid
// (slug, token) pairs consumes the same per-IP budget as guessing passcodes.

const PASSCODE_LIMIT = 10;
const PASSCODE_IP_LIMIT = 30;
const PASSCODE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

function clientIp(req: Request): string {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0]?.trim();
  return fwd || req.ip || 'unknown';
}

async function bumpAttempts(key: string, limit: number): Promise<boolean> {
  const now = Date.now();
  const newReset = new Date(now + PASSCODE_WINDOW_MS);

  // Reset the window if the existing row's resetAt is in the past, then $inc
  // unconditionally. Two atomic ops; matches the original Mongo design.
  await PasscodeAttempt.updateOne(
    { slug: key, resetAt: { $lt: new Date(now) } },
    { $set: { count: 0, resetAt: newReset } }
  );
  const updated = await PasscodeAttempt.findOneAndUpdate(
    { slug: key },
    { $inc: { count: 1 }, $setOnInsert: { resetAt: newReset } },
    { upsert: true, new: true }
  );

  return updated.count <= limit;
}

async function checkPasscodeRateLimit(slug: string, req: Request): Promise<boolean> {
  const slugKey = `slug:${slug || '_'}`;
  const ipKey = `ip:${clientIp(req)}`;
  const slugOk = await bumpAttempts(slugKey, PASSCODE_LIMIT);
  const ipOk = await bumpAttempts(ipKey, PASSCODE_IP_LIMIT);
  return slugOk && ipOk;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function getWeddingDisplay(wid: string) {
  const empty = {
    brideName: null,
    groomName: null,
    coupleName: null,
    weddingDate: null,
    weddingTitle: null,
  };
  if (!wid) return empty;
  try {
    const w = await Wedding.findById(wid).select('brideName groomName weddingDate').lean();
    if (!w) return empty;
    const bn = (w.brideName || '').trim() || null;
    const gn = (w.groomName || '').trim() || null;
    const cn = [bn, gn].filter(Boolean).join(' & ') || null;
    const weddingDate = String(w.weddingDate ?? '').trim() || null; // cast to string — may be a Date object
    return {
      brideName: bn,
      groomName: gn,
      coupleName: cn,
      weddingDate,
      weddingTitle: cn ? `${cn} Wedding` : 'Wedding',
    };
  } catch {
    return empty;
  }
}

async function getVisibleAlbums(wid: string) {
  if (!wid) return [];
  try {
    // Pull the cover image_url with the album in one aggregation, then sign
    // URLs application-side. Avoids N+1 Photo.findOne per album.
    const albums = await Album.aggregate([
      {
        $match: {
          weddingId: wid,
          hidden: { $ne: true },
          deletedByUser: { $ne: true },
        },
      },
      { $sort: { createdAt: 1 } },
      { $limit: 200 },
      {
        $lookup: {
          from: Photo.collection.name,
          let: { aid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$albumId', '$$aid'] } } },
            { $sort: { createdAt: -1, _id: -1 } },
            { $limit: 1 },
            { $project: { image_url: 1 } },
          ],
          as: 'cover',
        },
      },
      {
        $project: {
          title: 1,
          coverImageUrl: { $ifNull: [{ $arrayElemAt: ['$cover.image_url', 0] }, null] },
        },
      },
    ]);

    // Sign all cover URLs in one batch instead of per-album loops. Failures
    // for one key fall back to null in that slot rather than rejecting the
    // whole list — see buildSignedReadUrls.
    const coverUrls = await buildSignedReadUrls(albums.map((a: any) => a.coverImageUrl));
    const withCovers = albums.map((a: any, i: number) => ({
      id: a._id,
      title: a.title,
      coverUrl: coverUrls[i],
    }));

    return withCovers;
  } catch {
    return [];
  }
}

// HTML redirect page extracted into routes/shareLinkPage.ts.

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/share-links/generate  (requires auth)
router.post('/generate', authRequired, async (req: Request, res: Response) => {
  try {
    const { phone, role, weddingId, albumId, albumName, expiresAt, passcode } = req.body || {};

    if (!phone || String(phone).length < 4) {
      return res.status(400).json({ error: 'phone required (>=4 digits)' });
    }
    if (!weddingId) return res.status(400).json({ error: 'weddingId required' });
    if (!albumId) return res.status(400).json({ error: 'albumId required' });
    if (!['couple', 'guest', 'photographer'].includes(role)) {
      return res.status(400).json({ error: 'role must be couple|guest|photographer' });
    }

    const pass = String(passcode ?? '').trim();
    const requiresPasscode = pass.length > 0;
    if (requiresPasscode && pass.length < 4) {
      return res.status(400).json({ error: 'passcode min 4 chars' });
    }

    const albumExists = await Album.findById(albumId).select('_id').lean();
    if (!albumExists) return res.status(400).json({ error: 'Album not found' });

    // Block if an active link already exists for this role + album
    const activeLink = await ShareLink.findOne({
      weddingId: String(weddingId),
      albumId,
      role,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    }).select('slug expiresAt shareUrl').lean();

    if (activeLink) {
      return res.status(409).json({
        error: `An active ${role} link already exists. It must expire before a new one can be generated.`,
        existingLink: {
          slug:      activeLink.slug,
          expiresAt: activeLink.expiresAt,
          shareUrl:  activeLink.shareUrl,
        },
      });
    }

    const phonePrefix = String(phone).slice(0, 4);
    const passcodeHash = requiresPasscode ? await bcrypt.hash(pass, 10) : null;

    // Retry loop: find a unique slug and create atomically.
    // Regenerate token each attempt in case tokenHash also conflicts.
    const pb = getPublicBase(req);
    let entity;
    let token = '';
    const MAX_ATTEMPTS = 10;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      token = crypto.randomUUID();
      const tokenHash = hashToken(token);

      // Find an available slug
      let slug = '';
      for (let i = 0; i < 30; i++) {
        const candidate = buildSlug(phonePrefix, role);
        if (!(await ShareLink.findOne({ slug: candidate }).select('_id').lean())) {
          slug = candidate;
          break;
        }
      }
      if (!slug) return res.status(500).json({ error: 'Could not generate unique slug' });

      const guestShareUrl = `${pb}/api/s/${slug}?t=${token}`;

      try {
        entity = await ShareLink.create({
          slug,
          tokenHash,
          role,
          phonePrefix,
          weddingId: String(weddingId),
          albumId,
          albumName: albumName ?? null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          requiresPasscode,
          passcodeHash,
          shareUrl: guestShareUrl,
        });
        break; // success
      } catch (err: any) {
        console.error(`[shareLink] create attempt ${attempt + 1} failed - code:${err.code} keyValue:`, err.keyValue);
        if (err.code === 11000 && attempt < MAX_ATTEMPTS - 1) continue;
        if (err.code === 11000) return res.status(409).json({ error: 'Slug conflict, please retry' });
        throw err;
      }
    }
    if (!entity) return res.status(500).json({ error: 'Could not create share link' });

    const slug = entity.slug;
    const shareUrl = `${pb}/api/s/${slug}?t=${token}`;
    return res.json({
      url: shareUrl,
      redirectUrl: `${pb}/r?slug=${encodeURIComponent(slug)}&t=${encodeURIComponent(token)}`,
      appUrl: buildAppUrl(slug, token),
      expoGoUrl: buildExpoGo(slug, token),
      androidIntentUrl: buildIntent(buildExpoGo(slug, token)),
      photographerWebUrl: role === 'photographer' ? buildPhotographerUrl(slug, token) : null,
      slug,
      role,
      expiresAt: entity.expiresAt,
    });
  } catch (err: any) {
    console.error('[shareLink] /generate error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/share-links/resolve/:slug
router.post('/resolve/:slug', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug || '');
    const rawToken = String((req.query?.t as string) || req.body?.token || '').trim();
    if (!rawToken) return res.status(401).json({ error: 'Token required' });

    // Bump rate-limit counters before the slug lookup so probing for valid
    // (slug, token) pairs consumes the same per-IP budget as guessing
    // passcodes. Returns 429 once either the per-slug or per-IP cap is hit.
    if (!(await checkPasscodeRateLimit(slug, req))) {
      return res.status(429).json({ error: 'Too many attempts, try again later' });
    }

    const tokenHash = hashToken(rawToken);
    const link = await ShareLink.findOne({ slug, tokenHash }).populate('albumId', 'title').lean();
    if (!link) return res.status(404).json({ error: 'Invalid link' });
    if (isExpired(link.expiresAt)) return res.status(403).json({ error: 'Link expired' });

    if (link.requiresPasscode) {
      const p = String(req.body?.passcode ?? '').trim();
      if (!p) {
        // Return non-sensitive wedding preview so the app can render
        // create-album as background behind the password modal.
        const wid = String(link.weddingId || '');
        const [wd, albums] = await Promise.all([getWeddingDisplay(wid), getVisibleAlbums(wid)]);
        return res.status(401).json({
          error: 'Passcode required',
          requiresPasscode: true,
          role: link.role,
          coupleName: wd.coupleName,
          brideName: wd.brideName,
          groomName: wd.groomName,
          weddingDate: wd.weddingDate,
          weddingTitle: wd.weddingTitle,
          albums,
        });
      }
      if (!(await bcrypt.compare(p, String(link.passcodeHash || '')))) {
        return res.status(401).json({ error: 'Invalid passcode' });
      }
    }

    const wid = link.weddingId;
    const [wd, albums] = await Promise.all([getWeddingDisplay(wid), getVisibleAlbums(wid)]);

    // Issue access JWT for both guests and photographers so the app can fetch
    // photos via Bearer without re-sending the passcode on every request.
    let accessToken: string | null = null;
    try {
      accessToken = signPhotoJwt({
        typ: 'share-access',
        shareLinkId: String(link._id),
        slug,
        weddingId: wid,
        role: link.role,
      });
    } catch {
      return res.status(500).json({ error: 'Internal server error' });
    }

    return res.json({
      weddingId: wid,
      albumId: (link.albumId as any)?._id ? String((link.albumId as any)._id) : '',
      albumName: link.albumName || (link.albumId as any)?.title || null,
      albums,
      role: link.role,
      slug,
      requiresPasscode: !!link.requiresPasscode,
      unlocked: true,
      ...wd,
      accessToken,
      tokenType: accessToken ? 'Bearer' : null,
      expiresIn: accessToken ? env.PHOTOGRAPHER_JWT_EXPIRES_IN : null,
    });
  } catch (err: any) {
    console.error('[shareLink] /resolve error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/share/photos
sharePhotosRouter.get('/photos', async (req: Request, res: Response) => {
  try {
    let albumId = '';
    const bearer = String(req.headers.authorization || '').trim();
    const bt = bearer.startsWith('Bearer ') ? bearer.slice(7).trim() : '';

    if (bt) {
      // Bearer JWT path (guests + photographers both use this after resolve)
      try {
        const d = verifyPhotoJwt(bt);
        const rid = String(req.query?.albumId || '');
        if (!rid) return res.status(400).json({ error: 'albumId required' });
        const a = await Album.findOne({
          _id: rid,
          weddingId: d.weddingId,
          hidden: { $ne: true },
          deletedByUser: { $ne: true },
        })
          .select('_id')
          .lean();
        if (!a) return res.status(403).json({ error: 'Album not found' });
        albumId = String(a._id);
      } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    } else {
      // Guest / couple slug+token path
      const slug = String((req.query?.slug as string) || '');
      const rawToken = String((req.query?.t as string) || '');
      if (!slug || !rawToken) {
        return res.status(400).json({ error: 'Provide Bearer token or slug+t' });
      }

      // Same per-IP + per-slug throttle as /resolve — see checkPasscodeRateLimit.
      if (!(await checkPasscodeRateLimit(slug, req))) {
        return res.status(429).json({ error: 'Too many attempts, try again later' });
      }

      const tokenHash = hashToken(rawToken);
      const link = await ShareLink.findOne({ slug, tokenHash }).lean();
      if (!link) return res.status(404).json({ error: 'Invalid link' });
      if (isExpired(link.expiresAt)) return res.status(403).json({ error: 'Link expired' });
      if (!link.albumId) return res.status(400).json({ error: 'No album on this link' });

      // Passcode check applies to all paths, not just /resolve
      if (link.requiresPasscode) {
        const p = String((req.query?.passcode as string) || '').trim();
        if (!p) return res.status(401).json({ error: 'Passcode required' });
        if (!(await bcrypt.compare(p, String(link.passcodeHash || '')))) {
          return res.status(401).json({ error: 'Invalid passcode' });
        }
      }

      // If guest requests a specific album, verify it belongs to the same wedding
      const requestedAlbumId = String((req.query?.albumId as string) || '').trim();
      if (requestedAlbumId) {
        try {
          const a = await Album.findOne({
            _id: requestedAlbumId,
            weddingId: link.weddingId,
            hidden: { $ne: true },
            deletedByUser: { $ne: true },
          }).select('_id').lean();
          albumId = a ? String(a._id) : String(link.albumId);
        } catch {
          albumId = String(link.albumId);
        }
      } else {
        albumId = String(link.albumId);
      }
    }

    // Cursor pagination — same pattern as GET /api/photos so deep paging stays
    // O(limit) instead of O(skip). The cursor is the _id of the last item from
    // the previous page; with the (albumId, createdAt desc, _id desc) compound
    // index this remains an index-scan.
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query?.limit || '50'), 10) || 50));
    const cursor = String(req.query?.cursor || '').trim();

    const filter: any = { albumId };
    if (cursor) {
      const cursorDoc = await Photo.findById(cursor).select('createdAt').lean();
      if (cursorDoc) {
        filter.$or = [
          { createdAt: { $lt: cursorDoc.createdAt } },
          { createdAt: cursorDoc.createdAt, _id: { $lt: cursorDoc._id } },
        ];
      }
    }

    const photos = await Photo.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = photos.length > limit;
    const page = hasMore ? photos.slice(0, limit) : photos;
    const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

    const result = await Promise.all(
      page.map(async (p) => {
        const key = String(p.image_url || '').trim();
        if (!key) return null;
        return { id: p._id, uri: await buildSignedReadUrl(key), albumId };
      })
    );

    return res.json({
      data: result.filter(Boolean),
      meta: { albumId, limit, nextCursor, hasMore },
    });
  } catch (err: any) {
    console.error('[shareLink] /photos error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/r
shareRedirectRouter.get('/', async (req: Request, res: Response) => {
  const slug = String((req.query?.slug as string) || '');
  const rawToken = String((req.query?.t as string) || '');
  if (!slug || !rawToken) return res.status(400).json({ error: 'slug and t required' });

  const tokenHash = hashToken(rawToken);
  const link = await ShareLink.findOne({ slug, tokenHash }).select('expiresAt role').lean();
  if (!link) return res.status(404).json({ error: 'Invalid link' });
  if (isExpired(link.expiresAt)) return res.status(403).json({ error: 'Link expired' });
  if (link.role !== 'photographer') return res.status(403).json({ error: 'Photographer only' });
  return res.redirect(buildPhotographerUrl(slug, rawToken));
});

// GET /api/s/:slug
shareGateRouter.get('/:slug', async (req: Request, res: Response) => {
  const slug = String(req.params.slug || '');
  const rawToken = String((req.query?.t as string) || '');

  if (!rawToken) {
    res
      .status(401)
      .type('html')
      .send(renderPage({ title: 'Invalid link', appUrl: '', error: 'Token missing.' }));
    return;
  }

  const tokenHash = hashToken(rawToken);
  const link = await ShareLink.findOne({ slug, tokenHash }).select('expiresAt role').lean();

  if (!link) {
    res
      .status(404)
      .type('html')
      .send(renderPage({ title: 'Invalid link', appUrl: '', error: 'Link not found.' }));
    return;
  }
  if (isExpired(link.expiresAt)) {
    res
      .status(403)
      .type('html')
      .send(renderPage({ title: 'Expired', appUrl: '', error: 'Link expired.' }));
    return;
  }
  if (link.role === 'photographer') {
    res.redirect(buildPhotographerUrl(slug, rawToken));
    return;
  }

  if (link.role === 'guest') {
    res.redirect(buildGuestWebUrl(slug, rawToken));
    return;
  }

  const au = buildAppUrl(slug, rawToken);
  res.type('html').send(renderPage({ title: 'Open in UsForever', appUrl: au }));
});

// GET /api/share-links?weddingId=X&albumId=Y  (requires auth)
router.get('/', authRequired, async (req: Request, res: Response) => {
  try {
    const weddingId = String((req.query?.weddingId as string) || '').trim();
    const albumId   = String((req.query?.albumId   as string) || '').trim();

    if (!weddingId) return res.status(400).json({ error: 'weddingId required' });

    const filter: Record<string, any> = { weddingId };
    if (albumId) filter.albumId = albumId;

    const links = await ShareLink.find(filter)
      .select('slug role albumId albumName requiresPasscode expiresAt shareUrl createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      links: links.map((l) => ({
        slug:             l.slug,
        role:             l.role,
        albumId:          l.albumId,
        albumName:        l.albumName,
        shareUrl:         l.shareUrl,
        requiresPasscode: l.requiresPasscode,
        expiresAt:        l.expiresAt,
        createdAt:        (l as any).createdAt,
        expired:          isExpired(l.expiresAt),
      })),
    });
  } catch (err: any) {
    console.error('[shareLink] GET / error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export {
  router as shareLinkRouter,
  shareGateRouter,
  shareRedirectRouter,
  sharePhotosRouter,
};
export default router;
