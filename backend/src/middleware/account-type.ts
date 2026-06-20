import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/app-error';
import type { AccountType } from '../models/User';

export function requireAccountType(...allowed: AccountType[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }

    if (!allowed.includes(req.user.accountType)) {
      next(AppError.forbidden('You do not have permission to perform this action'));
      return;
    }

    next();
  };
}
