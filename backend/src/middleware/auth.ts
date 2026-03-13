import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'fenceai-dev-secret-change-in-production';

export interface AuthedRequest extends Request {
  userId: number;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('Authorization') ?? '';
  const [, token] = header.split(' ');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId?: number };
    if (!payload.userId) throw new Error('Invalid token');
    (req as AuthedRequest).userId = Number(payload.userId);
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

