import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { ROLES } from '../../lib/constants';
import { asyncHandler, badRequest, conflict, forbidden, notFound } from '../../lib/http';
import { money } from '../../lib/money';
import { serializeOrder, serializeUser } from '../../lib/serialize';
import { requireAdmin, requireStaff } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { phoneSchema } from '../auth/auth.schemas';

const router = Router();

router.use(requireStaff);

const listQuerySchema = z.object({
  role: z.enum(ROLES).optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof listQuerySchema>;

    // A manager may only browse clients. Staff records are admin territory.
    if (req.user!.role !== 'ADMIN' && query.role && query.role !== 'CLIENT') {
      throw forbidden('Перегляд персоналу доступний лише адміністратору');
    }
    const roleFilter = req.user!.role === 'ADMIN' ? query.role : 'CLIENT';

    const and: Prisma.UserWhereInput[] = [];
    if (roleFilter) and.push({ role: roleFilter });
    if (query.q) {
      and.push({
        OR: [
          { email: { contains: query.q.toLowerCase() } },
          { name: { contains: query.q } },
          { phone: { contains: query.q } },
        ],
      });
    }
    const where: Prisma.UserWhereInput = and.length ? { AND: and } : {};

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: { _count: { select: { orders: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    res.json({
      items: users.map((user) => ({ ...serializeUser(user), orderCount: user._count.orders })),
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        addresses: true,
        orders: { include: { items: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!user) throw notFound('Користувача не знайдено');
    if (req.user!.role !== 'ADMIN' && user.role !== 'CLIENT') {
      throw forbidden('Перегляд персоналу доступний лише адміністратору');
    }

    const spent = money(
      user.orders
        .filter((order) => order.status !== 'CANCELLED')
        .reduce((sum, order) => sum + order.total, 0),
    );

    res.json({
      item: serializeUser(user),
      orders: user.orders.map(serializeOrder),
      addresses: user.addresses.map((address) => ({
        id: address.id,
        label: address.label,
        city: address.city,
        warehouse: address.warehouse,
      })),
      stats: { orderCount: user.orders.length, spent },
    });
  }),
);

/* --------------------- staff management: admin only ---------------------- */

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Вкажіть ім’я').max(80),
  email: z.string().trim().toLowerCase().email('Некоректний email'),
  phone: phoneSchema.optional().or(z.literal('')),
  password: z.string().min(8, 'Пароль має містити щонайменше 8 символів').max(72),
  role: z.enum(ROLES),
});

router.post(
  '/',
  requireAdmin,
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof createUserSchema>;

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw conflict('Користувач з таким email уже існує');

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        password: await bcrypt.hash(input.password, 12),
        role: input.role,
      },
    });

    res.status(201).json({ item: serializeUser(user) });
  }),
);

const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  phone: phoneSchema.optional().or(z.literal('')),
  role: z.enum(ROLES),
  isActive: z.boolean(),
  password: z.string().min(8).max(72).optional().or(z.literal('')),
});

router.put(
  '/:id',
  requireAdmin,
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const input = req.body as z.infer<typeof updateUserSchema>;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw notFound('Користувача не знайдено');

    const duplicate = await prisma.user.findFirst({
      where: { email: input.email, id: { not: id } },
      select: { id: true },
    });
    if (duplicate) throw conflict('Цей email уже використовується');

    // Guard rails so the system can never be left without a working admin.
    if (existing.role === 'ADMIN' && (input.role !== 'ADMIN' || !input.isActive)) {
      const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
      if (activeAdmins <= 1) throw badRequest('Це останній активний адміністратор');
    }
    if (existing.id === req.user!.id && input.role !== 'ADMIN') {
      throw badRequest('Не можна знизити власну роль');
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        role: input.role,
        isActive: input.isActive,
        ...(input.password ? { password: await bcrypt.hash(input.password, 12) } : {}),
      },
    });

    res.json({ item: serializeUser(user) });
  }),
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw notFound('Користувача не знайдено');

    if (user.id === req.user!.id) throw badRequest('Не можна видалити власний акаунт');
    if (user.role === 'ADMIN') {
      // Administrators are never deletable through the panel.
      throw forbidden('Адміністраторів не можна видаляти');
    }

    const orderCount = await prisma.order.count({
      where: { OR: [{ userId: id }, { managerId: id }] },
    });
    if (orderCount > 0) {
      // Orders must keep their history, so the account is deactivated instead.
      const deactivated = await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      res.json({
        item: serializeUser(deactivated),
        deactivated: true,
        message: 'Користувач пов’язаний із замовленнями, тому акаунт деактивовано.',
      });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.json({ ok: true, deactivated: false, message: 'Користувача видалено' });
  }),
);

export default router;
