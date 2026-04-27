import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAlbum extends Document {
  title: string;
  event_date: Date | null;
  description: string | null;
  systemKey: string | null;
  weddingId: string;
  hidden: boolean;
  isDefault: boolean;
  deletedByUser: boolean;
  userId: Types.ObjectId | null;
}

const AlbumSchema = new Schema<IAlbum>(
  {
    title: { type: String, required: true },
    event_date: { type: Date, default: null },
    description: { type: String, default: null },
    systemKey: { type: String, default: null },
    weddingId: { type: String, required: true },
    hidden: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
    deletedByUser: { type: Boolean, default: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export const Album = mongoose.model<IAlbum>('Album', AlbumSchema);
