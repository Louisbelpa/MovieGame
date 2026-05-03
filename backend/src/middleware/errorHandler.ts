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

  if (status >= 500) {
    logger.error(
      { err, requestId: res.locals.requestId as string | undefined, path: req.path },
      'Unhandled error'
    );
  }

  const isDev = process.env.NODE_ENV === 'development';
  res.status(status).json({
    error: isDev ? err.message : 'Une erreur est survenue',
    ...(isDev && { stack: err.stack }),
  });
}
