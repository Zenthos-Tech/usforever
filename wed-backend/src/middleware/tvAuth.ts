import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { TvPairSession } from '../models/TvPairSession';

export interface TvAuthRequest extends Request {
  tv?: {
    weddingId: string;
    pairingId: string;
    shareType: string;
    scope: string;
  };
}

export async function tvAuthMiddleware(req: TvAuthRequest, res: Response, next: NextFunction) {
  try {
    const hdr = String(req.headers.authorization || '').trim();
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7).trim() : '';

    if (!token) {
      return res.status(401).json({ error: 'Missing TV token' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid TV token' });
    }

    if (decoded?.typ !== 'tv') {
      return res.status(401).json({ error: 'Not a TV token' });
    }
    if (!decoded?.weddingId) {
      return res.status(401).json({ error: 'Missing weddingId' });
    }

    // Check the pairing session is still active (not cancelled/expired)
    const session = await TvPairSession.findOne({ pairingId: decoded.pairingId }).lean();
    if (!session || session.status === 'CANCELLED' || session.status === 'EXPIRED') {
      return res.status(401).json({ error: 'TV session disconnected', code: 'SESSION_ENDED' });
    }

    req.tv = {
      weddingId: decoded.weddingId,
      pairingId: decoded.pairingId,
      shareType: decoded.shareType,
      scope: decoded.scope,
    };

    next();
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'TV auth failed' });
  }
}
