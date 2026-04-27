import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { env } from '../config/env';
import { User } from '../models/User';
import { Wedding } from '../models/Wedding';
import { Album } from '../models/Album';
import { isValidPhone, generateOtp, canRequestNewOtp, setOtpRecord, verifyOtp } from '../utils/otp';
import { makeWeddingSlug } from '../utils/helpers';

const router = Router();

async function ensureDefaultAlbumsForWedding(args: { weddingId: string; userId?: string | null }) {
  const DEFAULTS = ['Wedding', 'Engagement'] as const;

  const existing = await Album.find({ weddingId: args.weddingId, title: { $in: [...DEFAULTS] } }).lean();
  const byTitle = new Map<string, any>(existing.map((a) => [a.title, a]));

  for (const title of DEFAULTS) {
    if (byTitle.has(title)) continue;
    const created = await Album.create({
      title, description: 'Default album created automatically',
      weddingId: args.weddingId, ...(args.userId ? { userId: args.userId } : {}),
    });
    byTitle.set(title, created);
  }

  return {
    wedding: { albumId: byTitle.get('Wedding')?._id ?? null },
    engagement: { albumId: byTitle.get('Engagement')?._id ?? null },
  };
}

// POST /api/send-otp
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { contact_no } = req.body || {};
    if (!isValidPhone(contact_no)) return res.status(400).json({ error: 'contact_no must be exactly 10 digits' });

    const contactNumber = String(contact_no).trim();
    const canRequest = await canRequestNewOtp(contactNumber);
    if (!canRequest.allowed) return res.status(400).json({ error: `Please wait ${canRequest.waitSeconds}s before requesting a new OTP` });

    let user = await User.findOne({ contact_no: contactNumber });
    if (!user) {
      user = await User.create({
        username: `user_${contactNumber}`, email: `user_${contactNumber}@otp.com`,
        contact_no: contactNumber, confirmed: false, blocked: false,
      });
    }

    const otp = generateOtp();
    await setOtpRecord(contactNumber, otp);

    try {
      await axios.post('https://control.msg91.com/api/v5/otp', null, {
        params: {
          template_id: env.MSG91_TEMPLATE_ID,
          mobile: `91${contactNumber}`,
          authkey: env.MSG91_AUTH_KEY,
          otp: otp,
          sender: env.MSG91_SENDER_ID,
        },
      });
    } catch (smsErr: any) { console.error('MSG91 error:', smsErr.message); }

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err: any) {
    console.error('send-otp error:', err);
    res.status(500).json({ error: err.message || 'Failed to send OTP' });
  }
});

// POST /api/verify-otp
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { contact_no, otp } = req.body || {};
    if (!isValidPhone(contact_no) || !otp) return res.status(400).json({ error: 'contact_no and otp are required' });

    const contactNumber = String(contact_no).trim();
    const user = await User.findOne({ contact_no: contactNumber });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const otpResult = await verifyOtp(contactNumber, String(otp));
    if (!otpResult.success) return res.status(400).json({ error: otpResult.error });

    await User.findByIdAndUpdate(user._id, { confirmed: true });

    let wedding = await Wedding.findOne({ phone: contactNumber });
    if (!wedding) {
      try {
        wedding = await Wedding.create({ brideName: '', groomName: '', weddingDate: '', phone: contactNumber });
      } catch (e) {
        wedding = await Wedding.findOne({ phone: contactNumber });
      }
    }
    if (!wedding) return res.status(500).json({ error: 'Failed to create wedding' });

    let albums: any = null;
    try { albums = await ensureDefaultAlbumsForWedding({ weddingId: String(wedding._id), userId: String(user._id) }); } catch (e) { console.log('ensureDefaultAlbumsForWedding error', e); }

    const hasCompletedWeddingSetup =
      !!String(wedding.brideName || '').trim() &&
      !!String(wedding.groomName || '').trim() &&
      !!String(wedding.weddingDate || '').trim();

    const token = jwt.sign({ id: user._id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });

    res.json({
      success: true, message: 'OTP verified successfully', phone: contactNumber,
      userId: user._id, weddingId: wedding._id, weddingSlug: wedding.weddingSlug || null,
      brideName: wedding.brideName || '', groomName: wedding.groomName || '',
      weddingDate: wedding.weddingDate || '', hasCompletedWeddingSetup,
      profilePhoto: wedding.profilePhoto || null, albums, jwt: token,
    });
  } catch (err: any) {
    console.error('verify-otp error:', err);
    res.status(500).json({ error: err.message || 'Failed to verify OTP' });
  }
});

// POST /api/create-wedding
router.post('/create-wedding', async (req: Request, res: Response) => {
  try {
    const { brideName, groomName, weddingDate, phone } = req.body || {};
    const p = String(phone || '').trim();
    if (!isValidPhone(p)) return res.status(400).json({ error: 'phone must be exactly 10 digits' });
    if (!brideName || !groomName || !weddingDate) return res.status(400).json({ error: 'brideName, groomName, weddingDate are required' });

    const b = String(brideName).trim();
    const g = String(groomName).trim();
    const d = String(weddingDate).trim();

    const existing = await Wedding.findOne({ phone: p }).select('weddingSlug').lean();

    if (existing) {
      if (existing.weddingSlug) {
        await Wedding.findByIdAndUpdate(existing._id, { brideName: b, groomName: g, weddingDate: d });
        return res.json({ success: true, weddingId: existing._id, weddingSlug: existing.weddingSlug, updatedProfile: true, slugLocked: true });
      }
      const weddingSlug = makeWeddingSlug({ brideName: b, groomName: g, phone: p });
      await Wedding.findByIdAndUpdate(existing._id, { brideName: b, groomName: g, weddingDate: d, weddingSlug });
      return res.json({ success: true, weddingId: existing._id, weddingSlug, updatedProfile: true, slugCreatedNow: true });
    }

    const weddingSlug = makeWeddingSlug({ brideName: b, groomName: g, phone: p });
    const created = await Wedding.create({ brideName: b, groomName: g, weddingDate: d, phone: p, weddingSlug });
    res.json({ success: true, weddingId: created._id, weddingSlug });
  } catch (err: any) {
    console.error('createWedding error:', err);
    res.status(500).json({ error: err.message || 'Failed to create wedding' });
  }
});

export default router;
