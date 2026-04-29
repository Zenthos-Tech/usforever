import { Request } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// ─── Token helpers ──────────────────────────────────────────────────────────

/** SHA-256 hash of a raw share-link token. Raw tokens are never stored. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ─── Slug helpers ───────────────────────────────────────────────────────────

function twoLetters(): string {
  return (
    LETTERS[Math.floor(Math.random() * 26)] +
    LETTERS[Math.floor(Math.random() * 26)]
  );
}

export function buildSlug(pre: string, role: string): string {
  return `${pre}${twoLetters()}-${role}`;
}

// ─── URL builders ───────────────────────────────────────────────────────────

export function isExpired(d: any): boolean {
  return !!(d && new Date(d).getTime() < Date.now());
}

/**
 * Returns the public base URL for generating share links.
 *
 * Prefers the configured PUBLIC_APP_BASE_URL env var. In production we refuse
 * to derive the URL from the request's Host header, which is attacker-
 * controlled and would let a third party poison generated share links. In
 * development we fall back to the request host for convenience.
 */
export function getPublicBase(req: Request): string {
  const configured = env.PUBLIC_APP_BASE_URL.replace(/\/+$/, '');
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw Object.assign(new Error('PUBLIC_APP_BASE_URL is not configured'), { status: 500 });
  }
  return `${req.protocol}://${req.get('host')}`;
}

export function buildAppUrl(slug: string, token: string): string {
  return `${env.APP_SCHEME}://share/${encodeURIComponent(slug)}?t=${encodeURIComponent(token)}`;
}

export function buildExpoGo(slug: string, token: string): string {
  if (!env.EXPO_GO_BASE) return '';
  return `${env.EXPO_GO_BASE}/--/share/${encodeURIComponent(slug)}?t=${encodeURIComponent(token)}`;
}

export function buildIntent(u: string): string {
  if (!u.startsWith('exp://')) return '';
  return `intent://${u.replace(/^exp:\/\//, '')}#Intent;scheme=exp;package=host.exp.exponent;end`;
}

export function buildPhotographerUrl(slug: string, token: string): string {
  return `${env.PHOTOGRAPHER_WEB_APP}/photographer?slug=${encodeURIComponent(slug)}&t=${encodeURIComponent(token)}`;
}

export function buildGuestWebUrl(slug: string, token: string): string {
  return `${env.GUEST_WEB_URL.replace(/\/+$/, '')}/share/${encodeURIComponent(slug)}?t=${encodeURIComponent(token)}`;
}

// ─── JWT helpers ────────────────────────────────────────────────────────────

export function signPhotoJwt(payload: object): string {
  if (!env.PHOTOGRAPHER_JWT_SECRET) throw new Error('PHOTOGRAPHER_JWT_SECRET missing');
  return jwt.sign(payload, env.PHOTOGRAPHER_JWT_SECRET, {
    expiresIn: env.PHOTOGRAPHER_JWT_EXPIRES_IN as any,
  });
}

export function verifyPhotoJwt(token: string): any {
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
