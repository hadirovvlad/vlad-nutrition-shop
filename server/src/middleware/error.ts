import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { env } from '../env';
import { AppError } from '../lib/http';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ message: `Маршрут ${req.method} ${req.originalUrl} не знайдено` });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ message: err.message, details: err.details });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ message: 'Такий запис уже існує' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Запис не знайдено' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(409).json({ message: 'Запис використовується в інших даних і не може бути змінений' });
      return;
    }
  }

  if (!env.isProduction) {
    console.error(err);
  }

  res.status(500).json({ message: 'Щось пішло не так. Спробуйте ще раз.' });
};
