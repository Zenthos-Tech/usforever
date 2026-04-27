import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRecognition extends Document {
  face_id: string;
  cluster_id: string | null;
  photoId: Types.ObjectId | null;
  clusterId: Types.ObjectId | null;
}

const RecognitionSchema = new Schema<IRecognition>(
  {
    face_id: { type: String, required: true },
    cluster_id: { type: String, default: null },
    photoId: { type: Schema.Types.ObjectId, ref: 'Photo', default: null },
    clusterId: { type: Schema.Types.ObjectId, ref: 'Cluster', default: null },
  },
  { timestamps: true }
);

export const Recognition = mongoose.model<IRecognition>('Recognition', RecognitionSchema);
