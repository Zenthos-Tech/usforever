export const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

const MAX_ATTEMPTS = 3;
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const NEW_OTP_DELAY_MS = 10 * 1000;

type OtpRecord = {
  otp: string;
  expiresAt: number;
  attempts: number;
  nextOtpAt: number;
};

const otpStore: Record<string, OtpRecord> = {};

export const isValidPhone = (phone: any) => /^[0-9]{10}$/.test(String(phone || '').trim());

export function getOtpRecord(phone: string): OtpRecord | undefined {
  return otpStore[phone];
}

export function setOtpRecord(phone: string, otp: string): void {
  const now = Date.now();
  otpStore[phone] = {
    otp,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0,
    nextOtpAt: now + NEW_OTP_DELAY_MS,
  };
}

export function deleteOtpRecord(phone: string): void {
  delete otpStore[phone];
}

export function verifyOtp(phone: string, otp: string): { success: boolean; error?: string } {
  const now = Date.now();
  const record = otpStore[phone];

  if (!record) return { success: false, error: 'OTP not sent or expired' };

  if (now > record.expiresAt) {
    delete otpStore[phone];
    return { success: false, error: 'OTP expired' };
  }

  if (record.otp !== String(otp)) {
    record.attempts += 1;
    if (record.attempts >= MAX_ATTEMPTS) {
      delete otpStore[phone];
      return { success: false, error: 'Too many invalid attempts. Please request a new OTP.' };
    }
    return { success: false, error: 'Invalid OTP' };
  }

  delete otpStore[phone];
  return { success: true };
}

export function canRequestNewOtp(phone: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const existing = otpStore[phone];
  if (existing?.nextOtpAt && now < existing.nextOtpAt) {
    const wait = Math.ceil((existing.nextOtpAt - now) / 1000);
    return { allowed: false, waitSeconds: wait };
  }
  return { allowed: true };
}
