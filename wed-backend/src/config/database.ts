import mongoose from 'mongoose';
import { env } from './env';

export async function connectDB() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
