import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { prisma } from '../prisma';
import { AUTH_COOKIE, type Role } from '../lib/constants';
import { forbidden, unauthorized } from '../lib/http';
import { verifyToken } from '../lib/token';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function extractToken(req: Request): string | null {
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE];
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);

  return null;
}

/**
 * Populates req.user when a valid token is present. Never rejects — routes
 * decide whether authentication is mandatory.
 */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next();

  const payload = verifyToken(token);
  if (!payload) return next();

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
    });
    // The role is re-read from the database on every request, so a role change
    // or a deactivation takes effect immediately rather than at token expiry.
    if (user?.isActive) {
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role as Role,
      };
    }
  } catch {
    // A database hiccup must not turn into an authenticated request.
  }

  return next();
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  return next();
};

/** Role gate. Always applied on the server, never only in the UI. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    return next();
  };
}

export const requireAdmin = requireRole('ADMIN');
export const requireStaff = requireRole('ADMIN', 'MANAGER');
