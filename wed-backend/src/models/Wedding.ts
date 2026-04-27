import mongoose, { Schema, Document } from 'mongoose';

export interface IWedding extends Document {
  brideName: string;
  groomName: string;
  weddingDate: string;
  phone: string;
  weddingSlug: string | null;
  collection_name: string | null;
  profilePhoto: string | null;
  deletedDefaultAlbums: any;
  tvSelectedPhotoIds: string[];
}

const WeddingSchema = new Schema<IWedding>(
  {
    brideName: { type: String, default: '' },
    groomName: { type: String, default: '' },
    weddingDate: { type: String, default: '' },
    phone: { type: String, required: true, unique: true },
    weddingSlug: { type: String, unique: true, sparse: true, default: null },
    collection_name: { type: String, default: null },
    profilePhoto: { type: String, default: null },
    deletedDefaultAlbums: { type: Schema.Types.Mixed, default: null },
    tvSelectedPhotoIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Wedding = mongoose.model<IWedding>('Wedding', WeddingSchema);
