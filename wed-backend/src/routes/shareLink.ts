import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { buildSignedReadUrl } from '../config/s3';
import { ShareLink } from '../models/ShareLink';
import { Album } from '../models/Album';
import { Wedding } from '../models/Wedding';
import { Photo } from '../models/Photo';
import { PasscodeAttempt } from '../models/PasscodeAttempt';
import { escapeHtml } from '../utils/helpers';
import { authRequired } from '../middleware/auth';

const router = Router();
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// ─── Token helpers ────────────────────────────────────────────────────────────

/** SHA-256 hash of a raw token. Raw tokens are never stored in the DB. */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ─── Slug helpers ─────────────────────────────────────────────────────────────

function twoLetters(): string {
  return (
    LETTERS[Math.floor(Math.random() * 26)] +
    LETTERS[Math.floor(Math.random() * 26)]
  );
}

function buildSlug(pre: string, role: string): string {
  return `${pre}${twoLetters()}-${role}`;
}

// ─── URL builders ─────────────────────────────────────────────────────────────

function isExpired(d: any): boolean {
  return !!(d && new Date(d).getTime() < Date.now());
}

/**
 * Returns the public base URL for generating share links.
 * Prefers the configured PUBLIC_APP_BASE_URL env var over deriving from
 * request headers to prevent host-header injection attacks.
 */
function getPublicBase(req: Request): string {
  const configured = env.PUBLIC_APP_BASE_URL.replace(/\/+$/, '');
  if (configured) return configured;
  return `${req.protocol}://${req.get('host')}`;
}

function buildAppUrl(slug: string, token: string): string {
  return `${env.APP_SCHEME}://share/${encodeURIComponent(slug)}?t=${encodeURIComponent(token)}`;
}

function buildExpoGo(slug: string, token: string): string {
  if (!env.EXPO_GO_BASE) return '';
  return `${env.EXPO_GO_BASE}/--/share/${encodeURIComponent(slug)}?t=${encodeURIComponent(token)}`;
}

function buildIntent(u: string): string {
  if (!u.startsWith('exp://')) return '';
  return `intent://${u.replace(/^exp:\/\//, '')}#Intent;scheme=exp;package=host.exp.exponent;end`;
}

function buildPhotographerUrl(slug: string, token: string): string {
  return `${env.PHOTOGRAPHER_WEB_APP}/photographer?slug=${encodeURIComponent(slug)}&t=${encodeURIComponent(token)}`;
}

function buildGuestWebUrl(slug: string, token: string): string {
  return `${env.GUEST_WEB_URL.replace(/\/+$/, '')}/share/${encodeURIComponent(slug)}?t=${encodeURIComponent(token)}`;
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

function signPhotoJwt(payload: object): string {
  if (!env.PHOTOGRAPHER_JWT_SECRET) throw new Error('PHOTOGRAPHER_JWT_SECRET missing');
  return jwt.sign(payload, env.PHOTOGRAPHER_JWT_SECRET, {
    expiresIn: env.PHOTOGRAPHER_JWT_EXPIRES_IN as any,
  });
}

function verifyPhotoJwt(token: string): any {
  if (!env.PHOTOGRAPHER_JWT_SECRET) throw new Error('PHOTOGRAPHER_JWT_SECRET missing');
  const d = jwt.verify(token, env.PHOTOGRAPHER_JWT_SECRET) as any;
  // Accept both the new 'share-access' typ (guests + photographers) and the
  // legacy 'photographer-share-access' typ so old tokens keep working.
  const validTyp = d?.typ === 'share-access' || d?.typ === 'photographer-share-access';
  if (!validTyp || !d?.weddingId) {
    throw new Error('Invalid JWT');
  }
  return d;
}

// ─── Passcode rate limiter (Mongo, TTL-backed) ───────────────────────────────
// Limits brute-force attempts against passcode-protected links. Backed by the
// PasscodeAttempt collection with a TTL on `resetAt` so windows expire on
// their own. Survives restarts and works across multiple app instances.

const PASSCODE_LIMIT = 10;
const PASSCODE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

async function checkPasscodeRateLimit(slug: string): Promise<boolean> {
  const now = Date.now();
  const newReset = new Date(now + PASSCODE_WINDOW_MS);

  // Reset the window if the existing row's resetAt is in the past — atomic
  // upsert keyed on (slug, resetAt < now) followed by an unconditional $inc.
  await PasscodeAttempt.updateOne(
    { slug, resetAt: { $lt: new Date(now) } },
    { $set: { count: 0, resetAt: newReset } }
  );
  const updated = await PasscodeAttempt.findOneAndUpdate(
    { slug },
    {
      $inc: { count: 1 },
      $setOnInsert: { resetAt: newReset },
    },
    { upsert: true, new: true }
  );

  return updated.count <= PASSCODE_LIMIT;
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
    const albums = await Album.find({
      weddingId: wid,
      hidden: { $ne: true },
      deletedByUser: { $ne: true },
    })
      .select('title')
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    const withCovers = await Promise.all(
      albums.map(async (a) => {
        let coverUrl: string | null = null;
        try {
          const firstPhoto = await Photo.findOne({ albumId: a._id })
            .sort({ createdAt: -1 })
            .select('image_url')
            .lean();
          if (firstPhoto?.image_url) {
            coverUrl = await buildSignedReadUrl(String(firstPhoto.image_url));
          }
        } catch {}
        return { id: a._id, title: a.title, coverUrl };
      })
    );

    return withCovers;
  } catch {
    return [];
  }
}

// ─── HTML redirect page ───────────────────────────────────────────────────────

function buildAndroidIntentUrl(appUrl: string): string {
  if (!appUrl.startsWith('usforever://')) return '';
  const path = appUrl.slice('usforever://'.length);
  // package= targets the exact app, skipping any chooser dialog
  // S.browser_fallback_url keeps Chrome happy if the app is not installed
  const fallback = encodeURIComponent(appUrl);
  return `intent://${path}#Intent;scheme=usforever;package=com.anonymous.WeddingApp;S.browser_fallback_url=${fallback};end`;
}

function renderPage(args: {
  title?: string;
  appUrl: string;
  expoUrl?: string;
  androidIntentUrl?: string;
  error?: string;
}): string {
  const st = escapeHtml(args.title || 'Open in UsForever');
  const se = args.error
    ? `<div style="color:#c00;font-size:13px">${escapeHtml(args.error)}</div>`
    : '';
  const intentUrl = args.androidIntentUrl || buildAndroidIntentUrl(args.appUrl);
  const saIntent = escapeHtml(intentUrl || args.appUrl);

  // Use Android intent URL with explicit package — bypasses chooser entirely.
  // Falls back to plain usforever:// on iOS/desktop.
  const iUrl = JSON.stringify(intentUrl);
  const aUrl = JSON.stringify(args.appUrl);
  const headScript = args.appUrl
    ? '<script>(function(){' +
      'var isAnd=/android/i.test(navigator.userAgent);' +
      'var u=isAnd?' + iUrl + ':' + aUrl + ';' +
      'if(u){window.location.replace(u);}' +
      '})();</script>'
    : '';

  return (
    `<!doctype html><html><head><meta charset="utf-8"/>` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"/>` +
    `<title>${st}</title>` +
    headScript +
    `<style>body{font-family:system-ui;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.c{max-width:500px;border:1px solid #eee;border-radius:16px;padding:20px}a.b{display:block;padding:12px;border-radius:12px;text-align:center;background:#111;color:#fff;font-weight:700;text-decoration:none;margin-top:10px}</style>` +
    `</head><body><div class="c"><h3>${st}</h3>${se}` +
    (args.appUrl ? `<a class="b" href="${saIntent}">Open in UsForever</a>` : '') +
    `</div></body></html>`
  );
}

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

    const tokenHash = hashToken(rawToken);
    const link = await ShareLink.findOne({ slug, tokenHash }).populate('albumId', 'title').lean();
    if (!link) return res.status(404).json({ error: 'Invalid link' });
    if (isExpired(link.expiresAt)) return res.status(403).json({ error: 'Link expired' });

    if (link.requiresPasscode) {
      if (!(await checkPasscodeRateLimit(slug))) {
        return res.status(429).json({ error: 'Too many passcode attempts, try again later' });
      }
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
router.get('/photos', async (req: Request, res: Response) => {
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

      const tokenHash = hashToken(rawToken);
      const link = await ShareLink.findOne({ slug, tokenHash }).lean();
      if (!link) return res.status(404).json({ error: 'Invalid link' });
      if (isExpired(link.expiresAt)) return res.status(403).json({ error: 'Link expired' });
      if (!link.albumId) return res.status(400).json({ error: 'No album on this link' });

      // Passcode check applies to all paths, not just /resolve
      if (link.requiresPasscode) {
        if (!(await checkPasscodeRateLimit(slug))) {
          return res.status(429).json({ error: 'Too many attempts, try again later' });
        }
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

    // Paginated photo fetch
    const page = Math.max(1, parseInt(String(req.query?.page || '1'), 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query?.limit || '50'), 10) || 50));
    const skip = (page - 1) * limit;

    const photos = await Photo.find({ albumId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const result = await Promise.all(
      photos.map(async (p) => {
        const key = String(p.image_url || '').trim();
        if (!key) return null;
        return { id: p._id, uri: await buildSignedReadUrl(key), albumId };
      })
    );

    return res.json({ data: result.filter(Boolean), meta: { albumId, page, limit } });
  } catch (err: any) {
    console.error('[shareLink] /photos error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/r
router.get('/redirect', async (req: Request, res: Response) => {
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
router.get('/:slug', async (req: Request, res: Response) => {
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

export default router;
