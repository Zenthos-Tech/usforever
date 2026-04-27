import mongoose, { Schema, Document } from 'mongoose';

export interface IOtpRecord extends Document {
  phone: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
  nextOtpAt: Date;
}

const OtpRecordSchema = new Schema<IOtpRecord>(
  {
    phone: { type: String, required: true, unique: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    nextOtpAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL — Mongo deletes the record once expiresAt has passed.
OtpRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpRecord = mongoose.model<IOtpRecord>('OtpRecord', OtpRecordSchema);
