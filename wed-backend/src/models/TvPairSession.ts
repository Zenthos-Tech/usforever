import mongoose, { Schema, Document } from 'mongoose';

export interface ITvPairSession extends Document {
  pairingId: string;
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

export const TvPairSession = mongoose.model<ITvPairSession>('TvPairSession', TvPairSessionSchema);
