import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: required('JWT_SECRET', 'insecure-development-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  get isProduction() {
    return this.nodeEnv === 'production';
  },
};

if (env.isProduction && env.jwtSecret.includes('change-me')) {
  throw new Error('Refusing to start in production with the default JWT_SECRET.');
}
