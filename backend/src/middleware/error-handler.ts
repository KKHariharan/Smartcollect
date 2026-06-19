import type { NextFunction, Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error';
import { logger } from '../config/logger';
import { isProduction } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

interface MongoServerErrorLike {
  code?: number;
  keyValue?: Record<string, unknown>;
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
  } else if (err instanceof MongooseError.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  } else if (err instanceof MongooseError.CastError) {
    statusCode = 400;
    message = `Invalid value for field '${err.path}'`;
  } else if (
    typeof err === 'object' &&
    err !== null &&
    (err as MongoServerErrorLike).code === 11000
  ) {
    statusCode = 409;
    const field = Object.keys((err as MongoServerErrorLike).keyValue ?? {})[0] ?? 'field';
    message = `Duplicate value for '${field}'`;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof Error) {
    message = isProduction ? message : err.message;
  }

  if (statusCode >= 500) {
    logger.error(message, { err, path: req.originalUrl, method: req.method });
  } else {
    logger.warn(message, { path: req.originalUrl, method: req.method, statusCode });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details !== undefined ? { details } : {}),
    ...(!isProduction && err instanceof Error ? { stack: err.stack } : {}),
  });
}
