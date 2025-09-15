import { Request, Response, NextFunction } from 'express';
import { getUserFromAccessToken } from '../services/SupabaseClient';

function extractBearerToken(req: Request): string | null {
  const authHeader = (req.headers['authorization'] || req.headers['Authorization']) as string | undefined;
  if (!authHeader) return null;
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing bearer token',
      });
    }

    const { data, error } = await getUserFromAccessToken(token);
    if (error || !data?.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      });
    }

    (req as any).authUser = data.user;
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (!token) return next();
    const { data } = await getUserFromAccessToken(token);
    if (data?.user) {
      (req as any).authUser = data.user;
    }
    next();
  } catch (_err) {
    // Do not block the request on optional auth failure
    next();
  }
}
