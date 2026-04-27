import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPhoto extends Document {
  image_url: string;
  albumId: Types.ObjectId | null;
  uploadedById: Types.ObjectId | null;
  size_bytes: number;
  file_name: string | null;
  checksum: string | null;
  duplicate_group: string | null;
  media_type: string | null;
  mime_type: string | null;
  face_indexed: boolean;
  face_external_id: string | null;
  rek_collection: string | null;
  cluster_array: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const PhotoSchema = new Schema<IPhoto>(
  {
    image_url: { type: String, required: true },
    albumId: { type: Schema.Types.ObjectId, ref: 'Album', default: null },
    uploadedById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    size_bytes: { type: Number, default: 0 },
    file_name: { type: String, default: null },
    checksum: { type: String, default: null },
    duplicate_group: { type: String, default: null },
    media_type: { type: String, default: 'image' },
    mime_type: { type: String, default: null },
    face_indexed: { type: Boolean, default: false },
    face_external_id: { type: String, default: null },
    rek_collection: { type: String, default: null },
    cluster_array: { type: String, default: null },
  },
  { timestamps: true }
);

// Compound index for the paginated album photo fetch:
// GET /photos?albumId=X sorted by createdAt desc — this is the hot query path
PhotoSchema.index({ albumId: 1, createdAt: -1, _id: -1 });

// Used by duplicate-check and face-indexing lookups
PhotoSchema.index({ checksum: 1 });
PhotoSchema.index({ albumId: 1, file_name: 1 });

export const Photo = mongoose.model<IPhoto>('Photo', PhotoSchema);
