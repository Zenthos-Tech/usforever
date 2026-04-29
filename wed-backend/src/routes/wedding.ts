import { Router, Response } from 'express';
import { Wedding } from '../models/Wedding';
import { User } from '../models/User';
import { authRequired, AuthRequest } from '../middleware/auth';

const router = Router();

// Verify the authenticated user owns the wedding identified by either weddingId
// or phone. We link the two via User.contact_no === Wedding.phone — that's the
// only relationship the schema currently expresses.
async function loadOwnedWedding(
  userId: string,
  selector: { weddingId?: string; phone?: string }
) {
  const user = await User.findById(userId).select('contact_no').lean();
  if (!user || !user.contact_no) return { wedding: null, status: 403 as const };

  let wedding;
  if (selector.weddingId) wedding = await Wedding.findById(selector.weddingId).lean();
  else if (selector.phone) wedding = await Wedding.findOne({ phone: selector.phone }).lean();

  if (!wedding) return { wedding: null, status: 404 as const };
  if (String(wedding.phone) !== String(user.contact_no)) {
    return { wedding: null, status: 403 as const };
  }
  return { wedding, status: 200 as const };
}

// GET /api/weddings/context?weddingId=...&phone=...
router.get('/context', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const weddingId = String(req.query?.weddingId || '').trim();
    const phone = String(req.query?.phone || '').trim();
    if (!weddingId && !phone) {
      return res.status(400).json({ error: 'weddingId or phone required' });
    }

    const { wedding, status } = await loadOwnedWedding(req.user!.id, { weddingId, phone });
    if (!wedding) return res.status(status).json({ error: status === 403 ? 'Forbidden' : 'Wedding not found' });
    res.json({ data: wedding });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/weddings/context?weddingId=...&phone=...
router.patch('/context', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const weddingId = String(req.query?.weddingId || '').trim();
    const phone = String(req.query?.phone || '').trim();
    if (!weddingId && !phone) {
      return res.status(400).json({ error: 'weddingId or phone required' });
    }

    const { wedding, status } = await loadOwnedWedding(req.user!.id, { weddingId, phone });
    if (!wedding) return res.status(status).json({ error: status === 403 ? 'Forbidden' : 'Wedding not found' });

    const data: Record<string, any> = {};
    if (req.body?.brideName !== undefined) data.brideName = req.body.brideName;
    if (req.body?.groomName !== undefined) data.groomName = req.body.groomName;
    if (req.body?.weddingDate !== undefined) data.weddingDate = req.body.weddingDate;
    if (req.body?.profilePhoto !== undefined) data.profilePhoto = req.body.profilePhoto;

    const updated = await Wedding.findByIdAndUpdate(wedding._id, data, { new: true }).lean();
    res.json({ data: updated });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// NOTE: `GET /api/weddings/` (list every wedding) intentionally removed. It was
// unauthenticated PII leak (bride/groom names + phones for every couple) and
// no client used it.

router.get('/:id', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { wedding, status } = await loadOwnedWedding(req.user!.id, { weddingId: req.params.id });
    if (!wedding) return res.status(status).json({ error: status === 403 ? 'Forbidden' : 'Not found' });
    res.json({ data: wedding });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { wedding, status } = await loadOwnedWedding(req.user!.id, { weddingId: req.params.id });
    if (!wedding) return res.status(status).json({ error: status === 403 ? 'Forbidden' : 'Not found' });

    const data: Record<string, any> = {};
    if (req.body?.brideName !== undefined) data.brideName = req.body.brideName;
    if (req.body?.groomName !== undefined) data.groomName = req.body.groomName;
    if (req.body?.weddingDate !== undefined) data.weddingDate = req.body.weddingDate;
    if (req.body?.profilePhoto !== undefined) data.profilePhoto = req.body.profilePhoto;

    const updated = await Wedding.findByIdAndUpdate(wedding._id, data, { new: true }).lean();
    res.json({ data: updated });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { wedding, status } = await loadOwnedWedding(req.user!.id, { weddingId: req.params.id });
    if (!wedding) return res.status(status).json({ error: status === 403 ? 'Forbidden' : 'Not found' });

    await Wedding.findByIdAndDelete(wedding._id);
    res.json({ data: { id: req.params.id, deleted: true } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
