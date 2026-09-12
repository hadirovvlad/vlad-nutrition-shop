import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { DELIVERY_METHODS, ORDER_STATUSES, PAYMENT_METHODS } from '../../lib/constants';
import { asyncHandler, notFound } from '../../lib/http';
import { serializeOrder } from '../../lib/serialize';
import { requireStaff } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { phoneSchema } from '../auth/auth.schemas';

const router = Router();

// Orders are shared ground: both ADMIN and MANAGER work here.
router.use(requireStaff);

const listQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const orderInclude = {
  items: true,
  user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
  manager: { select: { id: true, name: true } },
} satisfies Prisma.OrderInclude;

router.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { status, q, page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>;

    const and: Prisma.OrderWhereInput[] = [];
    if (status) and.push({ status });
    if (q) {
      const asNumber = Number(q);
      and.push({
        OR: [
          ...(Number.isInteger(asNumber) ? [{ number: asNumber }] : []),
          { phone: { contains: q } },
          { email: { contains: q.toLowerCase() } },
          { lastName: { contains: q } },
          { firstName: { contains: q } },
        ],
      });
    }
    const where: Prisma.OrderWhereInput = and.length ? { AND: and } : {};

    const [total, orders, counts] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    res.json({
      items: orders.map(serializeOrder),
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      counts: Object.fromEntries(
        ORDER_STATUSES.map((value) => [
          value,
          counts.find((group) => group.status === value)?._count._all ?? 0,
        ]),
      ),
    });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        ...orderInclude,
        notes: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!order) throw notFound('Замовлення не знайдено');

    // Customer context that helps on the phone: how many orders they have.
    const customerOrders = order.userId
      ? await prisma.order.count({ where: { userId: order.userId } })
      : null;

    res.json({ item: serializeOrder(order), customerOrderCount: customerOrders });
  }),
);

const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional().or(z.literal('')),
});

router.patch(
  '/:id/status',
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { status, note } = req.body as z.infer<typeof statusSchema>;

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) throw notFound('Замовлення не знайдено');

    const order = await prisma.$transaction(async (tx) => {
      // Cancelling releases the reserved stock back to the warehouse.
      if (status === 'CANCELLED' && existing.status !== 'CANCELLED') {
        const items = await tx.orderItem.findMany({ where: { orderId: id } });
        for (const item of items) {
          if (!item.productId) continue;
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              soldCount: { decrement: item.quantity },
            },
          });
        }
      }

      if (note) {
        await tx.orderNote.create({
          data: { orderId: id, authorId: req.user!.id, text: note },
        });
      }

      return tx.order.update({
        where: { id },
        data: {
          status,
          // Whoever moves the order takes ownership of it.
          managerId: existing.managerId ?? req.user!.id,
        },
        include: orderInclude,
      });
    });

    res.json({ item: serializeOrder(order) });
  }),
);

const updateOrderSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  phone: phoneSchema,
  email: z.string().trim().toLowerCase().email(),
  deliveryMethod: z.enum(DELIVERY_METHODS),
  paymentMethod: z.enum(PAYMENT_METHODS),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  warehouse: z.string().trim().max(160).optional().or(z.literal('')),
  comment: z.string().trim().max(600).optional().or(z.literal('')),
});

router.put(
  '/:id',
  validate(updateOrderSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof updateOrderSchema>;
    const order = await prisma.order.update({
      where: { id: Number(req.params.id) },
      data: {
        ...data,
        city: data.city || null,
        warehouse: data.warehouse || null,
        comment: data.comment || null,
      },
      include: orderInclude,
    });
    res.json({ item: serializeOrder(order) });
  }),
);

router.post(
  '/:id/notes',
  validate(z.object({ text: z.string().trim().min(1, 'Введіть текст').max(1000) })),
  asyncHandler(async (req, res) => {
    const orderId = Number(req.params.id);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw notFound('Замовлення не знайдено');

    const note = await prisma.orderNote.create({
      data: { orderId, authorId: req.user!.id, text: (req.body as { text: string }).text },
      include: { author: { select: { id: true, name: true } } },
    });

    res.status(201).json({
      item: {
        id: note.id,
        text: note.text,
        createdAt: note.createdAt,
        author: note.author ? { id: note.author.id, name: note.author.name } : null,
      },
    });
  }),
);

router.patch(
  '/:id/assign',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.update({
      where: { id: Number(req.params.id) },
      data: { managerId: req.user!.id },
      include: orderInclude,
    });
    res.json({ item: serializeOrder(order) });
  }),
);

export default router;
