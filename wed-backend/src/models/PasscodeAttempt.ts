import mongoose, { Schema, Document } from 'mongoose';

export interface IPasscodeAttempt extends Document {
  /** Slug from the share link, or the empty string if the slug is missing. */
  slug: string;
  count: number;
  resetAt: Date;
}

const PasscodeAttemptSchema = new Schema<IPasscodeAttempt>(
  {
    slug: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
    resetAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL — Mongo deletes the row once `resetAt` has passed, which collapses
// "window expired" cleanup into the storage layer.
PasscodeAttemptSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export const PasscodeAttempt = mongoose.model<IPasscodeAttempt>(
  'PasscodeAttempt',
  PasscodeAttemptSchema
);
