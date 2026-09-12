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
  clientOrigin: process.env.CLIENT_ORIGIN ?? '',
  jwtSecret: required('JWT_SECRET', 'insecure-development-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  get isProduction() {
    return this.nodeEnv === 'production';
  },

  /**
   * Origins allowed to make credentialed cross-origin calls. Empty in
   * production by default, where the SPA is served from this same origin;
   * in development the Vite dev server needs an explicit entry.
   */
  get corsOrigins(): string[] {
    const configured = this.clientOrigin
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (configured.length > 0) return configured;
    return this.isProduction ? [] : ['http://localhost:5173'];
  },
};

if (env.isProduction && env.jwtSecret.includes('change-me')) {
  throw new Error('Refusing to start in production with the default JWT_SECRET.');
}
