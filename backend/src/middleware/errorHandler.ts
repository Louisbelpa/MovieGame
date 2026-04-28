import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

interface AppError extends Error {
  status?: number;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status ?? 500;
  const message = err.message ?? 'Internal server error';

  if (status >= 500) {
    logger.error(
      { err, requestId: res.locals.requestId as string | undefined, path: req.path },
      'Unhandled error'
    );
  }

  res.status(status).json({
    error: message,
    ...(res.locals.requestId ? { requestId: res.locals.requestId as string } : {}),
  });
}
