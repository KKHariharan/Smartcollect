import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/app-error';
import { verifyAccessToken } from '../utils/jwt';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(AppError.unauthorized('Missing or malformed Authorization header'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(AppError.unauthorized('Invalid or expired access token'));
  }
}
