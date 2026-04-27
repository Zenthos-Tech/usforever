import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string | null;
  email: string | null;
  contact_no: string | null;
  confirmed: boolean;
  blocked: boolean;
  password: string | null;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, default: null },
    email: { type: String, default: null },
    contact_no: { type: String, default: null },
    confirmed: { type: Boolean, default: false },
    blocked: { type: Boolean, default: false },
    password: { type: String, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
