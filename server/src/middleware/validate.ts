import type { RequestHandler } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { badRequest } from '../lib/http';

type Source = 'body' | 'query' | 'params';

function flatten(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

/** Validates and *replaces* the request segment with the parsed result. */
export function validate(schema: ZodTypeAny, source: Source = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(badRequest('Перевірте правильність заповнення полів', flatten(result.error)));
    }
    if (source === 'query') {
      // Express 4 defines `query` as a getter on some versions; assign safely.
      Object.defineProperty(req, 'query', { value: result.data, writable: true });
    } else {
      req[source] = result.data;
    }
    return next();
  };
}
