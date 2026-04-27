import { Router, Request, Response } from 'express';
import { authRequired, AuthRequest } from '../middleware/auth';
import * as tvPairService from '../services/tvPairService';

const router = Router();

// POST /api/tv/pair/start (public)
router.post('/start', async (req: Request, res: Response) => {
  try {
    const shareType = String(req.body?.shareType || 'family');
    const session = await tvPairService.startPairing({ shareType });
    res.json({
      pairingId: session.pairingId,
      status: session.status,
      expiresAt: session.expiresAt,
      ttlSeconds: session.ttlSeconds,
      qrPayload: session.qrPayload,
    });
  } catch (err: any) {
    console.error('tv/pair/start error', err);
    res.status(500).json({ error: err.message || 'start failed' });
  }
});

// GET /api/tv/pair/status (public)
router.get('/status', async (req: Request, res: Response) => {
  try {
    const pairingId = String(req.query?.pairingId || '').trim();
    if (!pairingId) return res.status(400).json({ error: 'pairingId is required' });

    const result = await tvPairService.getStatus({ pairingId });
    if (!result) return res.status(404).json({ error: 'Pairing session not found' });

    if (result.status === 'PAIRED') {
      res.json({
        pairingId: result.pairingId,
        status: result.status,
        expiresAt: result.expiresAt,
        weddingId: result.weddingId,
        tvToken: result.tvToken,
      });
    } else {
      res.json({
        pairingId: result.pairingId,
        status: result.status,
        expiresAt: result.expiresAt,
      });
    }
  } catch (err: any) {
    console.error('tv/pair/status error', err);
    res.status(500).json({ error: err.message || 'status failed' });
  }
});

// GET /api/tv/pair/active (auth required)
router.get('/active', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const weddingId = String(req.query?.weddingId || '').trim();
    if (!weddingId) return res.status(400).json({ error: 'weddingId is required' });

    const result = await tvPairService.getActiveByWeddingId({ weddingId });
    if (!result || result.status === 'DISCONNECTED') return res.json({ active: false });

    res.json({ active: true, pairingId: result.pairingId, expiresAt: result.expiresAt });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'active check failed' });
  }
});

// POST /api/tv/pair/confirm (auth required)
router.post('/confirm', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Login required' });

    const pairingId = String(req.body?.pairingId || '').trim();
    const weddingId = String(req.body?.weddingId || '').trim();

    if (!pairingId) return res.status(400).json({ error: 'pairingId is required' });
    if (!weddingId) return res.status(400).json({ error: 'weddingId is required' });

    const updated = await tvPairService.confirmPairing({
      pairingId,
      weddingId,
      userId: String(user.id),
    });

    if (!updated) return res.status(404).json({ error: 'Pairing session not found' });

    res.json({ ok: true, pairingId: updated.pairingId });
  } catch (err: any) {
    console.error('tv/pair/confirm error', err);
    res.status(500).json({ error: err.message || 'confirm failed' });
  }
});

// POST /api/tv/pair/heartbeat (tv-auth — called by the TV app every ~20s to signal it's alive)
import { tvAuthMiddleware, TvAuthRequest } from '../middleware/tvAuth';
router.post('/heartbeat', tvAuthMiddleware as any, async (req: TvAuthRequest, res: Response) => {
  try {
    const pairingId = (req as TvAuthRequest).tv?.pairingId;
    if (!pairingId) return res.status(400).json({ error: 'pairingId missing from token' });
    await tvPairService.tvHeartbeat({ pairingId });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'heartbeat failed' });
  }
});

// POST /api/tv/pair/disconnect (tv-auth — called by the TV app on logout)
router.post('/disconnect', tvAuthMiddleware as any, async (req: TvAuthRequest, res: Response) => {
  try {
    const pairingId = (req as TvAuthRequest).tv?.pairingId;
    if (!pairingId) return res.status(400).json({ error: 'pairingId missing from token' });
    await tvPairService.cancelPairingByTv({ pairingId });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'disconnect failed' });
  }
});

// POST /api/tv/pair/cancel (auth required)
router.post('/cancel', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Login required' });

    const pairingId = String(req.body?.pairingId || '').trim();
    if (!pairingId) return res.status(400).json({ error: 'pairingId is required' });

    const result = await tvPairService.cancelPairing({ pairingId, userId: String(user.id) });
    if (!result) return res.status(404).json({ error: 'Pairing session not found' });

    res.json({ ok: true });
  } catch (err: any) {
    console.error('tv/pair/cancel error', err);
    res.status(500).json({ error: err.message || 'cancel failed' });
  }
});

export default router;
