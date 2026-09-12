import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../env';
import type { Role } from './constants';

export type TokenPayload = {
  sub: number;
  role: Role;
};

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as SignOptions);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === 'string') return null;
    const sub = Number(decoded.sub);
    const role = decoded.role as Role | undefined;
    if (!Number.isInteger(sub) || !role) return null;
    return { sub, role };
  } catch {
    return null;
  }
}
