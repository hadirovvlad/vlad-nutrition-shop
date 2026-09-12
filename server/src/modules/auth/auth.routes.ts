import crypto from 'node:crypto';
import { Router, type CookieOptions, type Response } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../prisma';
import { env } from '../../env';
import { AUTH_COOKIE } from '../../lib/constants';
import { asyncHandler, badRequest, conflict, unauthorized } from '../../lib/http';
import { serializeUser } from '../../lib/serialize';
import { signToken } from '../../lib/token';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.schemas';

const router = Router();

/** Brute-force guard on the credential endpoints. */
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: env.isProduction ? 20 : 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Занадто багато спроб. Спробуйте пізніше.' },
});

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
});

function issueSession(res: Response, user: { id: number; role: string }) {
  const token = signToken({ sub: user.id, role: user.role as 'ADMIN' | 'MANAGER' | 'CLIENT' });
  res.cookie(AUTH_COOKIE, token, cookieOptions());
  return token;
}

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, phone, password } = req.body as {
      name: string;
      email: string;
      phone?: string;
      password: string;
    };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict('Користувач з таким email уже зареєстрований');

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: await bcrypt.hash(password, 12),
        // The role is never taken from the request body.
        role: 'CLIENT',
      },
    });

    const token = issueSession(res, user);
    res.status(201).json({ user: serializeUser(user), token });
  }),
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    // Same message for unknown email and wrong password — no account enumeration.
    if (!user) throw unauthorized('Невірний email або пароль');
    if (!user.isActive) throw unauthorized('Акаунт деактивовано. Зверніться до підтримки.');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw unauthorized('Невірний email або пароль');

    const token = issueSession(res, user);
    res.json({ user: serializeUser(user), token });
  }),
);

router.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    if (!req.user) {
      res.json({ user: null });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json({ user: user ? serializeUser(user) : null });
  }),
);

router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body as { email: string };
    const user = await prisma.user.findUnique({ where: { email } });

    // Always answer the same way so the endpoint cannot be used to probe emails.
    const response: { message: string; devToken?: string } = {
      message: 'Якщо акаунт існує, ми надіслали інструкції для відновлення пароля.',
    };

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: crypto.createHash('sha256').update(token).digest('hex'),
          resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      // No mail service in the MVP: outside production the token is returned so
      // the flow is testable end to end. Wire this to email before launch.
      if (!env.isProduction) response.devToken = token;
    }

    res.json(response);
  }),
);

router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body as { token: string; password: string };
    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: { resetToken: hashed, resetTokenExpiry: { gt: new Date() } },
    });
    if (!user) throw badRequest('Посилання для відновлення недійсне або застаріле');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(password, 12),
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: 'Пароль успішно змінено. Тепер ви можете увійти.' });
  }),
);

router.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw unauthorized();

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw badRequest('Поточний пароль вказано невірно');

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, 12) },
    });

    res.json({ message: 'Пароль оновлено' });
  }),
);

export default router;
