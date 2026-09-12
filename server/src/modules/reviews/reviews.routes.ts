import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { asyncHandler, notFound } from '../../lib/http';
import { serializeReview } from '../../lib/serialize';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

const reviewSchema = z.object({
  productId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1, 'Поставте оцінку').max(5),
  text: z.string().trim().min(10, 'Відгук має містити щонайменше 10 символів').max(2000),
});

/** Recomputes the denormalised rating/reviewCount on the product. */
async function refreshProductRating(productId: number) {
  const stats = await prisma.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: Math.round((stats._avg.rating ?? 0) * 10) / 10,
      reviewCount: stats._count._all,
    },
  });
}

router.get(
  '/product/:productId',
  asyncHandler(async (req, res) => {
    const reviews = await prisma.review.findMany({
      where: { productId: Number(req.params.productId), isApproved: true },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items: reviews.map(serializeReview) });
  }),
);

router.post(
  '/',
  requireAuth,
  validate(reviewSchema),
  asyncHandler(async (req, res) => {
    const { productId, rating, text } = req.body as z.infer<typeof reviewSchema>;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw notFound('Товар не знайдено');

    // One review per user per product; posting again edits the existing one.
    const review = await prisma.review.upsert({
      where: { userId_productId: { userId: req.user!.id, productId } },
      create: { userId: req.user!.id, productId, rating, text },
      update: { rating, text },
      include: { user: { select: { id: true, name: true } } },
    });

    await refreshProductRating(productId);

    res.status(201).json({ item: serializeReview(review) });
  }),
);

router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const reviews = await prisma.review.findMany({
      where: { userId: req.user!.id },
      include: { product: { select: { id: true, name: true, slug: true, image: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items: reviews.map(serializeReview) });
  }),
);

export { refreshProductRating };
export default router;
