import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { asyncHandler, conflict, notFound } from '../../lib/http';
import { serializeAddress, serializeOrder, serializeProduct, serializeUser } from '../../lib/serialize';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { updateProfileSchema } from '../auth/auth.schemas';

const router = Router();

// Everything below belongs to the signed-in user only.
router.use(requireAuth);

router.put(
  '/profile',
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const { name, phone, email } = req.body as { name: string; phone?: string; email: string };

    const duplicate = await prisma.user.findFirst({
      where: { email, id: { not: req.user!.id } },
      select: { id: true },
    });
    if (duplicate) throw conflict('Цей email уже використовується іншим акаунтом');

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      // `role` is deliberately absent: a client cannot promote itself.
      data: { name, phone: phone || null, email },
    });

    res.json({ user: serializeUser(user) });
  }),
);

const addressSchema = z.object({
  label: z.string().trim().max(60).default('Основна'),
  city: z.string().trim().min(2, 'Вкажіть місто').max(80),
  warehouse: z.string().trim().min(1, 'Вкажіть відділення').max(140),
  recipient: z.string().trim().max(120).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  isDefault: z.boolean().default(false),
});

router.get(
  '/addresses',
  asyncHandler(async (req, res) => {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });
    res.json({ items: addresses.map(serializeAddress) });
  }),
);

router.post(
  '/addresses',
  validate(addressSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof addressSchema>;
    const count = await prisma.address.count({ where: { userId: req.user!.id } });
    const isDefault = data.isDefault || count === 0;

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: req.user!.id,
        label: data.label,
        city: data.city,
        warehouse: data.warehouse,
        recipient: data.recipient || null,
        phone: data.phone || null,
        isDefault,
      },
    });

    res.status(201).json({ item: serializeAddress(address) });
  }),
);

router.put(
  '/addresses/:id',
  validate(addressSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = req.body as z.infer<typeof addressSchema>;

    // Scoped by userId so one client cannot edit another's address by id.
    const existing = await prisma.address.findFirst({ where: { id, userId: req.user!.id } });
    if (!existing) throw notFound('Адресу не знайдено');

    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data: {
        label: data.label,
        city: data.city,
        warehouse: data.warehouse,
        recipient: data.recipient || null,
        phone: data.phone || null,
        isDefault: data.isDefault || existing.isDefault,
      },
    });

    res.json({ item: serializeAddress(address) });
  }),
);

router.delete(
  '/addresses/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.address.findFirst({ where: { id, userId: req.user!.id } });
    if (!existing) throw notFound('Адресу не знайдено');
    await prisma.address.delete({ where: { id } });
    res.json({ ok: true });
  }),
);

router.get(
  '/favorites',
  asyncHandler(async (req, res) => {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user!.id },
      include: { product: { include: { brand: true, category: true } } },
      orderBy: { createdAt: 'desc' },
    });
    // Favourites pointing at a delisted product are hidden from both the list
    // and the ids, so the header counter and this page can never disagree.
    const visible = favorites.filter((favorite) => favorite.product.isActive);

    res.json({
      items: visible.map((favorite) => serializeProduct(favorite.product)),
      ids: visible.map((favorite) => favorite.productId),
    });
  }),
);

router.post(
  '/favorites/:productId',
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.productId);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw notFound('Товар не знайдено');

    await prisma.favorite.upsert({
      where: { userId_productId: { userId: req.user!.id, productId } },
      create: { userId: req.user!.id, productId },
      update: {},
    });

    res.json({ ok: true, productId });
  }),
);

router.delete(
  '/favorites/:productId',
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.productId);
    await prisma.favorite.deleteMany({ where: { userId: req.user!.id, productId } });
    res.json({ ok: true, productId });
  }),
);

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items: orders.map(serializeOrder) });
  }),
);

router.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      // Ownership is part of the query, so a guessed id returns 404.
      where: { id: Number(req.params.id), userId: req.user!.id },
      include: { items: true, manager: { select: { id: true, name: true } } },
    });
    if (!order) throw notFound('Замовлення не знайдено');
    res.json({ item: serializeOrder(order) });
  }),
);

export default router;
