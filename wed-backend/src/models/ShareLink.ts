import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IShareLink extends Document {
  slug: string;
  tokenHash: string; // SHA-256 hash of the raw token — raw token is never stored
  role: 'couple' | 'guest' | 'photographer';
  weddingId: string;
  albumId: Types.ObjectId | null;
  requiresPasscode: boolean;
  passcodeHash: string | null;
  phonePrefix: string;
  albumName: string | null;
  expiresAt: Date | null;
  shareUrl: string | null;
}

const ShareLinkSchema = new Schema<IShareLink>(
  {
    slug: { type: String, required: true, unique: true },
    tokenHash: { type: String, required: true, unique: true },
    role: { type: String, enum: ['couple', 'guest', 'photographer'], required: true },
    weddingId: { type: String, required: true },
    albumId: { type: Schema.Types.ObjectId, ref: 'Album', default: null },
    requiresPasscode: { type: Boolean, default: false },
    passcodeHash: { type: String, default: null },
    phonePrefix: { type: String, required: true },
    albumName: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    shareUrl: { type: String, default: null },
  },
  { timestamps: true }
);

// Auto-delete share links once their `expiresAt` has passed. Mongo's TTL
// monitor only deletes documents where the field is a Date in the past, so
// "no limit" links (expiresAt: null) are kept indefinitely as before.
ShareLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ShareLink = mongoose.model<IShareLink>('ShareLink', ShareLinkSchema);
