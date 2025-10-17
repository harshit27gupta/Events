import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const headerId = (req.headers['x-request-id'] as string) || '';
  const requestId = headerId || randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = typeof err?.status === 'number' ? err.status : 500;
  const message = err?.message || 'Internal Server Error';
  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error({ err }, 'Unhandled error');
  }
  res.status(status).json({ error: message });
}


