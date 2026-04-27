import crypto from 'crypto';
import { OtpRecord } from '../models/OtpRecord';

// Cryptographically-secure 4-digit OTP. crypto.randomInt is uniform over the
// half-open range [min, max), which gives values 1000..9999 inclusive.
export const generateOtp = () => crypto.randomInt(1000, 10000).toString();

const MAX_ATTEMPTS = 3;
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const NEW_OTP_DELAY_MS = 10 * 1000;

export const isValidPhone = (phone: any) => /^[0-9]{10}$/.test(String(phone || '').trim());

/**
 * Persist an OTP for the given phone number. Records expire automatically via
 * the TTL index on `expiresAt` (see models/OtpRecord.ts), so we don't need to
 * track them in process memory anymore — multi-instance deploys and restarts
 * keep working.
 */
export async function setOtpRecord(phone: string, otp: string): Promise<void> {
  const now = Date.now();
  await OtpRecord.findOneAndUpdate(
    { phone },
    {
      otp,
      expiresAt: new Date(now + OTP_EXPIRY_MS),
      attempts: 0,
      nextOtpAt: new Date(now + NEW_OTP_DELAY_MS),
    },
    { upsert: true, new: true }
  );
}

export async function deleteOtpRecord(phone: string): Promise<void> {
  await OtpRecord.deleteOne({ phone });
}

export async function verifyOtp(
  phone: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const now = Date.now();
  const record = await OtpRecord.findOne({ phone });
  if (!record) return { success: false, error: 'OTP not sent or expired' };

  if (now > record.expiresAt.getTime()) {
    await OtpRecord.deleteOne({ phone });
    return { success: false, error: 'OTP expired' };
  }

  if (record.otp !== String(otp)) {
    record.attempts += 1;
    if (record.attempts >= MAX_ATTEMPTS) {
      await OtpRecord.deleteOne({ phone });
      return { success: false, error: 'Too many invalid attempts. Please request a new OTP.' };
    }
    await record.save();
    return { success: false, error: 'Invalid OTP' };
  }

  await OtpRecord.deleteOne({ phone });
  return { success: true };
}

export async function canRequestNewOtp(
  phone: string
): Promise<{ allowed: boolean; waitSeconds?: number }> {
  const now = Date.now();
  const existing = await OtpRecord.findOne({ phone }).select('nextOtpAt').lean();
  if (existing?.nextOtpAt && now < existing.nextOtpAt.getTime()) {
    const wait = Math.ceil((existing.nextOtpAt.getTime() - now) / 1000);
    return { allowed: false, waitSeconds: wait };
  }
  return { allowed: true };
}
