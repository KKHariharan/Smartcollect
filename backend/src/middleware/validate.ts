import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

interface ValidationSchemas {
  body?: ZodType<unknown>;
  query?: ZodType<unknown>;
  params?: ZodType<unknown>;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query) as typeof req.query;
    }
    if (schemas.params) {
      req.params = schemas.params.parse(req.params) as typeof req.params;
    }
    next();
  };
}
