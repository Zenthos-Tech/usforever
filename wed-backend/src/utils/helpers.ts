import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';

export const toBytes = (v: any): number => {
  const n = Number(v || 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
};

/** True if the value is a valid 24-char hex Mongo ObjectId. */
export const isValidObjectId = (v: any): boolean => {
  return typeof v === 'string' && mongoose.Types.ObjectId.isValid(v) && /^[a-f\d]{24}$/i.test(v);
};

export const formatUploadedLabel = (iso?: string | Date | null): string | null => {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  const formatted = dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `Uploaded on ${formatted}`;
};

export const slugify = (v: any): string => {
  const s = String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s || 'untitled';
};

export const normalizePhone = (v: any): string => {
  const s = String(v ?? '').trim();
  if (!s) return '';
  return s.replace(/[^\d]/g, '');
};

export const onlyLetters = (s: any) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

export const mixNames = (a: any, b: any) => {
  const A = onlyLetters(a);
  const B = onlyLetters(b);
  if (!A && !B) return 'usforever';
  return (A.slice(0, 3) + B.slice(0, 3)).slice(0, 10) || 'usforever';
};

export const randAZ = (len = 3) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[crypto.randomInt(0, chars.length)];
  return out;
};

export const makeWeddingSlug = (args: { brideName: string; groomName: string; phone: string }) => {
  const base = mixNames(args.brideName, args.groomName);
  const p = String(args.phone || '').trim();
  const tail = randAZ(3);
  return `${base}_${p}_${tail}`;
};

export const safeExtFromName = (fileName: string): string => {
  const ext = String(path.extname(fileName || '') || '').toLowerCase();
  if (!ext) return '';
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
  if (!allowed.includes(ext)) return '';
  return ext;
};

export const buildCoupleFolder = (coupleSlug: string, phoneDigits: string, weddingIdNum: number): string => {
  const slug = String(coupleSlug || '').trim().toLowerCase() || `wedding-${weddingIdNum}`;
  const p = String(phoneDigits || '').trim();
  if (!p) return `${slug}_${weddingIdNum}`;
  if (slug.includes(p)) return slug;
  return `${slug}_${p}`;
};

export const escapeHtml = (s: any): string => {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

export const generateS3Key = (coupleFolder: string, albumFolder: string, ext: string): string => {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const rnd = crypto.randomBytes(4).toString('hex');
  return `${coupleFolder}/${albumFolder}/${ts}_${rnd}${ext}`;
};
