import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { TvPairSession } from '../models/TvPairSession';

function addMinutes(date: Date, minutes: number) { return new Date(date.getTime() + minutes * 60 * 1000); }
function isExpired(d?: Date | null) { return !d || new Date(d).getTime() <= Date.now(); }

// Last 6 hex chars of the UUID, uppercased — keeps the previous human-typed
// pairing code stable while letting us index it.
function shortCodeFromPairingId(pairingId: string): string {
  return pairingId.replace(/-/g, '').slice(-6).toUpperCase();
}
// TV app heartbeats every ~20s; allow ~4 missed beats before declaring the
// session dead. Anything below the heartbeat cadence will flap PAIRED
// sessions to DISCONNECTED almost immediately.
const TV_DISCONNECT_THRESHOLD_SEC = 90;

export async function startPairing({ shareType = 'family' }: { shareType?: string } = {}) {
  const ttlMin = Math.max(1, Math.min(30, env.TV_PAIR_TTL_MINUTES));
  const pairingId = crypto.randomUUID();
  const expiresAt = addMinutes(new Date(), ttlMin);

  await TvPairSession.create({
    pairingId,
    shortCode: shortCodeFromPairingId(pairingId),
    status: 'WAITING',
    expiresAt,
    shareType: shareType === 'photographer' ? 'photographer' : 'family',
  });

  return { pairingId, status: 'WAITING', expiresAt: expiresAt.toISOString(), ttlSeconds: ttlMin * 60, qrPayload: `${env.APP_SCHEME}://tv/pair?pairingId=${encodeURIComponent(pairingId)}` };
}

export async function getStatus({ pairingId }: { pairingId: string }) {
  const row = await TvPairSession.findOne({ pairingId }).lean();
  if (!row) return null;

  if (row.status === 'WAITING' && isExpired(row.expiresAt)) {
    await TvPairSession.updateOne({ pairingId }, { status: 'EXPIRED' });
    return { pairingId, status: 'EXPIRED' as const, expiresAt: row.expiresAt };
  }

  // If PAIRED but TV hasn't sent a heartbeat in TV_DISCONNECT_THRESHOLD_SEC,
  // report as DISCONNECTED.
  if (row.status === 'PAIRED' && row.tvLastSeenAt) {
    const staleSec = (Date.now() - new Date(row.tvLastSeenAt).getTime()) / 1000;
    if (staleSec > TV_DISCONNECT_THRESHOLD_SEC) {
      return { pairingId: row.pairingId, status: 'DISCONNECTED' as any, expiresAt: row.expiresAt, weddingId: row.weddingId, tvToken: row.tvToken };
    }
  }

  return { pairingId: row.pairingId, status: row.status, expiresAt: row.expiresAt, weddingId: row.weddingId, tvToken: row.tvToken };
}

export async function confirmPairing({ pairingId, weddingId, userId }: { pairingId: string; weddingId: string; userId: string }) {
  // Try exact UUID match first
  let row = await TvPairSession.findOne({ pairingId }).lean();

  // Fallback: mobile enters XX-XX-XX (6 chars). Look the row up by the
  // indexed `shortCode` column instead of scanning every WAITING session.
  if (!row) {
    const shortCode = pairingId.replace(/-/g, '').toUpperCase();
    if (shortCode.length === 6) {
      const matched = await TvPairSession.findOne({ shortCode, status: 'WAITING' }).lean();
      if (matched) { row = matched; pairingId = matched.pairingId; }
    }
  }

  if (!row) return null;
  if (row.status !== 'WAITING') return { pairingId, status: row.status, expiresAt: row.expiresAt };

  if (isExpired(row.expiresAt)) {
    await TvPairSession.updateOne({ pairingId }, { status: 'EXPIRED' });
    return { pairingId, status: 'EXPIRED' as const, expiresAt: row.expiresAt };
  }

  const tvToken = jwt.sign(
    { typ: 'tv', pairingId, weddingId, scope: 'tv:read', shareType: row.shareType || 'family' },
    env.JWT_SECRET, { expiresIn: env.TV_TOKEN_TTL as any }
  );

  // Cancel any other active sessions for this wedding so old TV builds can't keep a stale session alive
  await TvPairSession.updateMany(
    { weddingId, status: { $in: ['PAIRED', 'WAITING'] }, pairingId: { $ne: pairingId } },
    { status: 'CANCELLED', pairedAt: new Date() }
  );
  await TvPairSession.updateOne({ pairingId }, { status: 'PAIRED', weddingId, pairedByUserId: userId, pairedAt: new Date(), tvToken, tvLastSeenAt: new Date() });
  return { pairingId, status: 'PAIRED' as const, expiresAt: row.expiresAt, weddingId };
}

export async function getActiveByWeddingId({ weddingId }: { weddingId: string }) {
  const row = await TvPairSession.findOne({ weddingId, status: 'PAIRED' }).lean();
  if (!row) return null;

  // If TV hasn't sent a heartbeat in TV_DISCONNECT_THRESHOLD_SEC, treat as disconnected
  if (row.tvLastSeenAt) {
    const staleSec = (Date.now() - new Date(row.tvLastSeenAt).getTime()) / 1000;
    if (staleSec > TV_DISCONNECT_THRESHOLD_SEC) return { pairingId: row.pairingId, status: 'DISCONNECTED' as any, weddingId: row.weddingId };
  }

  return { pairingId: row.pairingId, status: row.status, expiresAt: row.expiresAt, weddingId: row.weddingId };
}

export async function tvHeartbeat({ pairingId }: { pairingId: string }) {
  await TvPairSession.updateOne({ pairingId, status: 'PAIRED' }, { tvLastSeenAt: new Date() });
}

export async function cancelPairingByTv({ pairingId }: { pairingId: string }) {
  await TvPairSession.updateOne({ pairingId }, { status: 'CANCELLED', pairedAt: new Date() });
  return { pairingId, status: 'CANCELLED' as const };
}

export async function cancelPairing({ pairingId, userId }: { pairingId: string; userId: string }) {
  const row = await TvPairSession.findOne({ pairingId }).lean();
  if (!row) return null;
  if (row.status !== 'WAITING' && row.status !== 'PAIRED') return { pairingId, status: row.status };

  // Cancel this session and any other active sessions for the same weddingId
  const weddingId = row.weddingId;
  await TvPairSession.updateOne({ pairingId }, { status: 'CANCELLED', pairedByUserId: userId, pairedAt: new Date() });
  if (weddingId) {
    await TvPairSession.updateMany(
      { weddingId, status: { $in: ['WAITING', 'PAIRED'] }, pairingId: { $ne: pairingId } },
      { status: 'CANCELLED', pairedAt: new Date() }
    );
  }
  return { pairingId, status: 'CANCELLED' as const };
}
