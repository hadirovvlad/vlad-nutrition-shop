import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { DELIVERY_METHODS, PAYMENT_METHODS } from '../../lib/constants';
import { asyncHandler, badRequest } from '../../lib/http';
import { money } from '../../lib/money';
import { serializeOrder } from '../../lib/serialize';
import { validate } from '../../middleware/validate';
import { phoneSchema } from '../auth/auth.schemas';

const router = Router();

const createOrderSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.coerce.number().int().positive(),
          quantity: z.coerce.number().int().min(1).max(99),
          weight: z.string().trim().max(40).optional().or(z.literal('')),
          flavor: z.string().trim().max(60).optional().or(z.literal('')),
        }),
      )
      .min(1, 'Кошик порожній'),
    firstName: z.string().trim().min(2, 'Вкажіть ім’я').max(60),
    lastName: z.string().trim().min(2, 'Вкажіть прізвище').max(60),
    phone: phoneSchema,
    email: z.string().trim().toLowerCase().email('Некоректний email'),
    deliveryMethod: z.enum(DELIVERY_METHODS),
    paymentMethod: z.enum(PAYMENT_METHODS),
    city: z.string().trim().max(80).optional().or(z.literal('')),
    warehouse: z.string().trim().max(160).optional().or(z.literal('')),
    comment: z.string().trim().max(600).optional().or(z.literal('')),
  })
  .superRefine((value, ctx) => {
    // Nova Poshta needs a destination; self-pickup does not.
    if (value.deliveryMethod === 'NOVA_POSHTA') {
      if (!value.city) {
        ctx.addIssue({ code: 'custom', path: ['city'], message: 'Вкажіть місто доставки' });
      }
      if (!value.warehouse) {
        ctx.addIssue({
          code: 'custom',
          path: ['warehouse'],
          message: 'Вкажіть відділення або поштомат',
        });
      }
    }
  });

/** POST /api/orders — checkout. Works for guests and signed-in clients. */
router.post(
  '/',
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof createOrderSchema>;

    // Merge duplicate lines (same product + same options) before pricing.
    const merged = new Map<string, { productId: number; quantity: number; weight?: string; flavor?: string }>();
    for (const item of payload.items) {
      const key = `${item.productId}|${item.weight ?? ''}|${item.flavor ?? ''}`;
      const existing = merged.get(key);
      if (existing) {
        existing.quantity = Math.min(99, existing.quantity + item.quantity);
      } else {
        merged.set(key, { ...item, weight: item.weight || undefined, flavor: item.flavor || undefined });
      }
    }
    const lines = Array.from(merged.values());

    const products = await prisma.product.findMany({
      where: { id: { in: lines.map((line) => line.productId) }, isActive: true },
    });
    const byId = new Map(products.map((product) => [product.id, product]));

    for (const line of lines) {
      const product = byId.get(line.productId);
      if (!product) throw badRequest('Один із товарів більше недоступний. Оновіть кошик.');
      if (product.stock < line.quantity) {
        throw badRequest(
          product.stock > 0
            ? `«${product.name}»: в наявності лише ${product.stock} шт.`
            : `«${product.name}» закінчився на складі.`,
        );
      }
    }

    // Prices always come from the database, never from the request body.
    const itemsData = lines.map((line) => {
      const product = byId.get(line.productId)!;
      return {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image: product.image,
        price: product.price,
        quantity: line.quantity,
        weight: line.weight ?? product.weight ?? null,
        flavor: line.flavor ?? product.flavor ?? null,
      };
    });

    const subtotal = money(
      itemsData.reduce((sum, item) => sum + item.price * item.quantity, 0),
    );

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: req.user?.id ?? null,
          status: 'NEW',
          subtotal,
          discount: 0,
          total: subtotal,
          deliveryMethod: payload.deliveryMethod,
          paymentMethod: payload.paymentMethod,
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: payload.phone,
          email: payload.email,
          city: payload.city || null,
          warehouse: payload.warehouse || null,
          comment: payload.comment || null,
          items: { create: itemsData },
        },
        include: { items: true },
      });

      // Human-facing number; the spec's example order is №1048.
      const numbered = await tx.order.update({
        where: { id: created.id },
        data: { number: 1047 + created.id },
        include: { items: true },
      });

      for (const item of itemsData) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            soldCount: { increment: item.quantity },
          },
        });
      }

      return numbered;
    });

    res.status(201).json({ item: serializeOrder(order) });
  }),
);

/** Order confirmation page — readable by number without exposing the customer. */
router.get(
  '/confirmation/:number',
  asyncHandler(async (req, res) => {
    const number = Number(req.params.number);
    if (!Number.isInteger(number)) throw badRequest('Некоректний номер замовлення');

    const order = await prisma.order.findUnique({
      where: { number },
      include: { items: true },
    });
    if (!order) throw badRequest('Замовлення не знайдено');

    res.json({
      item: {
        number: order.number,
        status: order.status,
        total: order.total,
        deliveryMethod: order.deliveryMethod,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      },
    });
  }),
);

export default router;
