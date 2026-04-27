import mongoose, { Schema, Document } from 'mongoose';

export interface ITvPairSession extends Document {
  pairingId: string;
  /** 6-char A-Z0-9 code shown to users when they type the pairing manually. */
  shortCode: string | null;
  status: 'WAITING' | 'PAIRED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: Date;
  pairedAt: Date | null;
  weddingId: string | null;
  pairedByUserId: string | null;
  tvToken: string | null;
  shareType: 'family' | 'photographer';
  tvLastSeenAt: Date | null;
}

const TvPairSessionSchema = new Schema<ITvPairSession>(
  {
    pairingId: { type: String, required: true, unique: true },
    // Indexed for the manual-entry fallback (mobile types 6 chars). Sparse so
    // the unique constraint ignores legacy rows with no shortCode.
    shortCode: { type: String, default: null, index: { unique: true, sparse: true } },
    status: { type: String, enum: ['WAITING', 'PAIRED', 'EXPIRED', 'CANCELLED'], default: 'WAITING' },
    expiresAt: { type: Date, required: true },
    pairedAt: { type: Date, default: null },
    weddingId: { type: String, default: null },
    pairedByUserId: { type: String, default: null },
    tvToken: { type: String, default: null },
    shareType: { type: String, enum: ['family', 'photographer'], default: 'family' },
    tvLastSeenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Drop pairing rows that haven't been touched in 30 days. Live PAIRED sessions
// have updatedAt refreshed on every heartbeat (`tvHeartbeat`), so this only
// reaps abandoned WAITING / EXPIRED / CANCELLED rows.
TvPairSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const TvPairSession = mongoose.model<ITvPairSession>('TvPairSession', TvPairSessionSchema);
