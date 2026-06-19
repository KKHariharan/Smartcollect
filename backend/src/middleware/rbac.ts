import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/app-error';
import { PERMISSIONS } from '../constants/permissions';

export function requirePermission(...required: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }

    const userPermissions = req.user.permissions;
    const hasWildcard = userPermissions.includes(PERMISSIONS.WILDCARD);
    const hasRequired = required.some((permission) => userPermissions.includes(permission));

    if (!hasWildcard && !hasRequired) {
      next(AppError.forbidden('You do not have permission to perform this action'));
      return;
    }

    next();
  };
}
