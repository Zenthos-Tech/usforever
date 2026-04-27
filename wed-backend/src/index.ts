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
import shareLinkRoutes from './routes/shareLink';
import tvPairRoutes from './routes/tvPair';
import tvMediaRoutes from './routes/tvMedia';
import weddingRoutes from './routes/wedding';
import contactRoutes from './routes/contact';

const app = express();
const upload = multer({ dest: '/tmp/uploads/' });

// CORS — production must set CORS_ALLOWED_ORIGINS to a comma-separated list
// (e.g. https://app.usforever.com,https://usforever.com). Empty list keeps the
// permissive `*` behaviour for local development only.
const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = env.CORS_ALLOWED_ORIGINS
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (isProd && allowedOrigins.length === 0) {
  console.warn(
    '[cors] CORS_ALLOWED_ORIGINS is empty in production — refusing all browser origins.'
  );
}

app.use(cors({
  origin: (origin, cb) => {
    // Non-browser clients (mobile app, server-to-server) send no Origin header.
    if (!origin) return cb(null, true);
    if (allowedOrigins.length === 0) {
      // Dev-only fallback. In prod the warning above fires and we deny below.
      return cb(null, !isProd);
    }
    return cb(null, allowedOrigins.includes(origin));
  },
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

app.post('/api/share-links/generate', (req, res, next) => {
  req.url = '/generate';
  shareLinkRoutes(req, res, next);
});
app.post('/api/share-links/resolve/:slug', (req, res, next) => {
  req.url = `/resolve/${encodeURIComponent(req.params.slug)}`;
  shareLinkRoutes(req, res, next);
});
app.get('/api/s/:slug', (req, res, next) => {
  req.url = `/${req.params.slug}?${new URLSearchParams(req.query as any).toString()}`;
  shareLinkRoutes(req, res, next);
});
app.get('/api/share/photos', (req, res, next) => {
  req.url = `/photos?${new URLSearchParams(req.query as any).toString()}`;
  shareLinkRoutes(req, res, next);
});
app.get('/api/r', (req, res, next) => {
  req.url = `/redirect?${new URLSearchParams(req.query as any).toString()}`;
  shareLinkRoutes(req, res, next);
});
app.get('/api/share-links', (req, res, next) => {
  req.url = `/?${new URLSearchParams(req.query as any).toString()}`;
  shareLinkRoutes(req, res, next);
});

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
