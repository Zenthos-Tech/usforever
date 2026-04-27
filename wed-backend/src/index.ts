import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';

import userRoutes from './routes/user';
import photoRoutes from './routes/photo';
import faceRoutes from './routes/face';
import albumRoutes from './routes/album';
import {
  shareLinkRouter,
  shareGateRouter,
  shareRedirectRouter,
  sharePhotosRouter,
} from './routes/shareLink';
import tvPairRoutes from './routes/tvPair';
import tvMediaRoutes from './routes/tvMedia';
import weddingRoutes from './routes/wedding';
import contactRoutes from './routes/contact';

const app = express();
const upload = multer({ dest: '/tmp/uploads/' });

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'ngrok-skip-browser-warning'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', userRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/face', upload.single('image'), faceRoutes);
app.use('/api/albums', albumRoutes);

// Share-link sub-routers, each at its proper public prefix. The previous
// implementation rewrote `req.url` and lost array query params via
// URLSearchParams.toString(); using app.use() keeps Express's parsing intact.
app.use('/api/share-links', shareLinkRouter);
app.use('/api/s', shareGateRouter);
app.use('/api/r', shareRedirectRouter);
app.use('/api/share', sharePhotosRouter);

app.use('/api/tv/pair', tvPairRoutes);
app.use('/api/tv', tvMediaRoutes);
app.use('/api/weddings', weddingRoutes);
app.use('/api/contact', contactRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

async function main() {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`Server running on http://${env.HOST}:${env.PORT}`);
  });
}

main();

process.on('SIGTERM', async () => { await disconnectDB(); process.exit(0); });
process.on('SIGINT', async () => { await disconnectDB(); process.exit(0); });
