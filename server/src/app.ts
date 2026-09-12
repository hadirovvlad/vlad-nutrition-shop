import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './env';
import { errorHandler, notFoundHandler } from './middleware/error';
import { attachUser } from './middleware/auth';
import accountRoutes from './modules/account/account.routes';
import authRoutes from './modules/auth/auth.routes';
import catalogRoutes from './modules/catalog/catalog.routes';
import mgmtRoutes from './modules/mgmt';
import ordersRoutes from './modules/orders/orders.routes';
import reviewRoutes from './modules/reviews/reviews.routes';
import { UPLOAD_DIR } from './modules/mgmt/uploads.routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      // Images are served cross-origin to the Vite dev server.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // In production the SPA is served from this same origin, so cross-origin
  // access is not needed and is left off unless CLIENT_ORIGIN is set
  // explicitly (for a separately hosted frontend).
  const corsOrigins = env.corsOrigins;
  if (corsOrigins.length > 0) {
    app.use(cors({ origin: corsOrigins, credentials: true }));
  }

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (!env.isProduction) app.use(morgan('dev'));

  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      limit: env.isProduction ? 300 : 5000,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { message: 'Занадто багато запитів. Спробуйте за хвилину.' },
    }),
  );

  // Populates req.user from the auth cookie / bearer token for every route.
  app.use(attachUser);

  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, env: env.nodeEnv, time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/catalog', catalogRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/account', accountRoutes);
  app.use('/api/mgmt', mgmtRoutes);

  // In production the built SPA is served from the same origin.
  if (env.isProduction) {
    const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
