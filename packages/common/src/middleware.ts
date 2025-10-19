import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { getLogger } from './logger';
import { AppError, isTrustedError } from './errors';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const headerId = (req.headers['x-request-id'] as string) || '';
  const requestId = headerId || randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const logger = getLogger();
  const requestId = (req as any).requestId || 'unknown';
  const status = isTrustedError(err) ? err.status : 500;

  logger.error({ err, requestId }, 'Unhandled error');
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: (err instanceof AppError) ? err.code : undefined,
    requestId
  });
}


