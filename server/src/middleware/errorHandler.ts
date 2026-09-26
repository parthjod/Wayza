import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Global error handler — sanitized in production, detailed in development.
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;

  console.error(`[ERROR] ${statusCode} - ${err.message}`, {
    stack: err.stack,
    code: err.code,
  });

  if (env.NODE_ENV === 'production' && statusCode === 500) {
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    ...(err.code && { code: err.code }),
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Create a typed application error
 */
export function createError(
  message: string,
  statusCode: number = 500,
  code?: string
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}
