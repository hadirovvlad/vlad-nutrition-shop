import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { asyncHandler, notFound } from '../../lib/http';
import { serializeReview } from '../../lib/serialize';
import { requireAdmin, requireStaff } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { refreshProductRating } from '../reviews/reviews.routes';

const router = Router();

const include = {
  user: { select: { id: true, name: true } },
  product: { select: { id: true, name: true, slug: true, image: true } },
} as const;

router.get(
  '/',
  requireStaff,
  validate(
    z.object({
      status: z.enum(['all', 'approved', 'pending']).default('all'),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const { status } = req.query as unknown as { status: 'all' | 'approved' | 'pending' };
    const reviews = await prisma.review.findMany({
      where: status === 'all' ? {} : { isApproved: status === 'approved' },
      include,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items: reviews.map(serializeReview) });
  }),
);

router.patch(
  '/:id',
  requireAdmin,
  validate(z.object({ isApproved: z.boolean() })),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) throw notFound('Відгук не знайдено');

    const review = await prisma.review.update({
      where: { id },
      data: { isApproved: (req.body as { isApproved: boolean }).isApproved },
      include,
    });
    await refreshProductRating(review.productId);

    res.json({ item: serializeReview(review) });
  }),
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) throw notFound('Відгук не знайдено');

    await prisma.review.delete({ where: { id } });
    await refreshProductRating(existing.productId);

    res.json({ ok: true });
  }),
);

export default router;
