import mongoose, { Schema, Document } from 'mongoose';

export interface ICluster extends Document {
  cluster_id: string;
}

const ClusterSchema = new Schema<ICluster>(
  {
    cluster_id: { type: String, required: true },
  },
  { timestamps: true }
);

export const Cluster = mongoose.model<ICluster>('Cluster', ClusterSchema);
