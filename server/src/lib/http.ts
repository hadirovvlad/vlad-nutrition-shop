import type { NextFunction, Request, RequestHandler, Response } from 'express';

export class AppError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message = 'Некоректний запит', details?: unknown) =>
  new AppError(400, message, details);
export const unauthorized = (message = 'Потрібна авторизація') => new AppError(401, message);
export const forbidden = (message = 'Недостатньо прав доступу') => new AppError(403, message);
export const notFound = (message = 'Не знайдено') => new AppError(404, message);
export const conflict = (message = 'Конфлікт даних') => new AppError(409, message);

/** Wraps an async handler so rejected promises reach the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
