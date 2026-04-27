import { Router, Request, Response } from 'express';
import { Wedding } from '../models/Wedding';

const router = Router();

// GET /api/weddings/context?weddingId=...&phone=...
router.get('/context', async (req: Request, res: Response) => {
  try {
    const weddingId = String(req.query?.weddingId || '').trim();
    const phone = String(req.query?.phone || '').trim();

    let wedding;
    if (weddingId) wedding = await Wedding.findById(weddingId).lean();
    else if (phone) wedding = await Wedding.findOne({ phone }).lean();

    if (!wedding) return res.status(404).json({ error: 'Wedding not found' });
    res.json({ data: wedding });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/weddings/context?weddingId=...&phone=...
router.patch('/context', async (req: Request, res: Response) => {
  try {
    const weddingId = String(req.query?.weddingId || '').trim();
    const phone = String(req.query?.phone || '').trim();

    const data: Record<string, any> = {};
    if (req.body?.brideName !== undefined) data.brideName = req.body.brideName;
    if (req.body?.groomName !== undefined) data.groomName = req.body.groomName;
    if (req.body?.weddingDate !== undefined) data.weddingDate = req.body.weddingDate;
    if (req.body?.profilePhoto !== undefined) data.profilePhoto = req.body.profilePhoto;

    let wedding;
    if (weddingId) wedding = await Wedding.findByIdAndUpdate(weddingId, data, { new: true }).lean();
    else if (phone) wedding = await Wedding.findOneAndUpdate({ phone }, data, { new: true }).lean();

    if (!wedding) return res.status(404).json({ error: 'Wedding not found' });
    res.json({ data: wedding });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query?.limit || 25), 100);
    const offset = Number(req.query?.offset || 0);
    const weddings = await Wedding.find().sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
    res.json({ data: weddings, meta: { limit, offset } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const wedding = await Wedding.findById(req.params.id).lean();
    if (!wedding) return res.status(404).json({ error: 'Not found' });
    res.json({ data: wedding });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data: Record<string, any> = {};
    if (req.body?.brideName !== undefined) data.brideName = req.body.brideName;
    if (req.body?.groomName !== undefined) data.groomName = req.body.groomName;
    if (req.body?.weddingDate !== undefined) data.weddingDate = req.body.weddingDate;
    if (req.body?.profilePhoto !== undefined) data.profilePhoto = req.body.profilePhoto;

    const updated = await Wedding.findByIdAndUpdate(req.params.id, data, { new: true }).lean();
    res.json({ data: updated });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await Wedding.findByIdAndDelete(req.params.id);
    res.json({ data: { id: req.params.id, deleted: true } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
