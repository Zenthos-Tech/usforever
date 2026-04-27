import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';

export interface AuthRequest extends Request {
  user?: { id: string; username?: string | null; email?: string | null };
}

export async function authRequired(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const hdr = String(req.headers.authorization || '').trim();
    if (!hdr.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing or invalid Authorization header' });

    const token = hdr.slice(7).trim();
    if (!token) return res.status(401).json({ error: 'Token missing' });

    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };
    if (!decoded?.id) return res.status(401).json({ error: 'Invalid token payload' });

    const user = await User.findById(decoded.id).select('username email').lean();
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = { id: String(user._id), username: user.username, email: user.email };
    next();
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Invalid token' });
  }
}
