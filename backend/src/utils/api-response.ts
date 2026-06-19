import type { Response } from 'express';

export interface ApiSuccessBody<T> {
  success: true;
  message: string;
  data: T;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
): void {
  const body: ApiSuccessBody<T> = { success: true, message, data };
  res.status(statusCode).json(body);
}
