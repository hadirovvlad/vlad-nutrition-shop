import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { GOALS, PRODUCT_FORMS } from '../../lib/constants';
import { asyncHandler, badRequest, forbidden, notFound } from '../../lib/http';
import { stringifyList } from '../../lib/json';
import { money } from '../../lib/money';
import { derivedProductFields } from '../../lib/product-fields';
import { serializeProduct } from '../../lib/serialize';
import { uniqueSlug } from '../../lib/slug';
import { requireAdmin, requireStaff } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

router.use(requireStaff);

const GOAL_SLUGS = GOALS.map((goal) => goal.slug);

const productSchema = z.object({
  name: z.string().trim().min(2, 'Вкажіть назву товару').max(160),
  slug: z.string().trim().max(120).optional().or(z.literal('')),
  description: z.string().trim().max(6000).default(''),
  composition: z.string().trim().max(4000).default(''),
  usage: z.string().trim().max(4000).default(''),
  price: z.coerce.number().min(0.01, 'Ціна має бути більшою за нуль').max(1_000_000),
  oldPrice: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  stock: z.coerce.number().int().min(0).max(1_000_000).default(0),
  brandId: z.coerce.number().int().positive('Виберіть бренд'),
  categoryId: z.coerce.number().int().positive('Виберіть категорію'),
  weight: z.string().trim().max(40).optional().or(z.literal('')),
  flavor: z.string().trim().max(60).optional().or(z.literal('')),
  form: z.enum(PRODUCT_FORMS).optional().or(z.literal('')),
  weights: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  flavors: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  goals: z.array(z.enum(GOAL_SLUGS as [string, ...string[]])).max(6).default([]),
  image: z.string().trim().max(500).optional().or(z.literal('')),
  images: z.array(z.string().trim().max(500)).max(10).default([]),
  specs: z
    .array(z.object({ label: z.string().trim().min(1).max(80), value: z.string().trim().min(1).max(200) }))
    .max(30)
    .default([]),
  isNew: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  seoTitle: z.string().trim().max(200).optional().or(z.literal('')),
  seoDescription: z.string().trim().max(400).optional().or(z.literal('')),
});

type ProductInput = z.infer<typeof productSchema>;

async function assertTaxonomy(brandId: number, categoryId: number) {
  const [brand, category] = await Promise.all([
    prisma.brand.findUnique({ where: { id: brandId } }),
    prisma.category.findUnique({ where: { id: categoryId } }),
  ]);
  if (!brand) throw badRequest('Такого бренду не існує');
  if (!category) throw badRequest('Такої категорії не існує');
  return { brand, category };
}

function toWriteData(
  input: ProductInput,
  names: { brandName: string; categoryName: string },
): Omit<Prisma.ProductUncheckedCreateInput, 'slug'> {
  const derived = derivedProductFields({
    name: input.name,
    price: input.price,
    oldPrice: input.oldPrice ?? null,
    brandName: names.brandName,
    categoryName: names.categoryName,
    flavors: input.flavors,
    description: input.description,
  });

  return {
    name: input.name,
    description: input.description,
    composition: input.composition,
    usage: input.usage,
    stock: input.stock,
    brandId: input.brandId,
    categoryId: input.categoryId,
    weight: input.weight || null,
    flavor: input.flavor || null,
    form: input.form || null,
    weights: stringifyList(input.weights),
    flavors: stringifyList(input.flavors),
    goals: stringifyList(input.goals),
    image: input.image || input.images[0] || null,
    images: stringifyList(input.images),
    specs: JSON.stringify(input.specs),
    isNew: input.isNew,
    isBestseller: input.isBestseller,
    isFeatured: input.isFeatured,
    isActive: input.isActive,
    seoTitle: input.seoTitle || null,
    seoDescription: input.seoDescription || null,
    ...derived,
  };
}

const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  brandId: z.coerce.number().int().positive().optional(),
  lowStock: z.union([z.string(), z.boolean()]).optional().transform((v) => v === true || v === 'true'),
  onSale: z.union([z.string(), z.boolean()]).optional().transform((v) => v === true || v === 'true'),
  sort: z.enum(['new', 'name', 'stock', 'price-asc', 'price-desc']).default('new'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const ORDER_BY: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
  new: [{ createdAt: 'desc' }],
  name: [{ name: 'asc' }],
  stock: [{ stock: 'asc' }],
  'price-asc': [{ price: 'asc' }],
  'price-desc': [{ price: 'desc' }],
};

router.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof listQuerySchema>;

    const and: Prisma.ProductWhereInput[] = [];
    if (query.q) and.push({ searchIndex: { contains: query.q.toLowerCase() } });
    if (query.categoryId) and.push({ categoryId: query.categoryId });
    if (query.brandId) and.push({ brandId: query.brandId });
    if (query.lowStock) and.push({ stock: { lte: 10 } });
    if (query.onSale) and.push({ discountPercent: { gt: 0 } });
    const where: Prisma.ProductWhereInput = and.length ? { AND: and } : {};

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { brand: true, category: true },
        orderBy: ORDER_BY[query.sort],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    res.json({
      items: products.map(serializeProduct),
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    });
  }),
);

router.get(
  '/delete-requests',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: { deleteRequested: true },
      include: { brand: true, category: true },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ items: products.map(serializeProduct) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
      include: { brand: true, category: true },
    });
    if (!product) throw notFound('Товар не знайдено');
    res.json({ item: serializeProduct(product) });
  }),
);

/** Creating products is an admin capability. */
router.post(
  '/',
  requireAdmin,
  validate(productSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as ProductInput;
    const { brand, category } = await assertTaxonomy(input.brandId, input.categoryId);

    const slug = await uniqueSlug(input.slug || input.name, async (candidate) =>
      Boolean(await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })),
    );

    const product = await prisma.product.create({
      data: { ...toWriteData(input, { brandName: brand.name, categoryName: category.name }), slug },
      include: { brand: true, category: true },
    });

    res.status(201).json({ item: serializeProduct(product) });
  }),
);

router.put(
  '/:id',
  requireAdmin,
  validate(productSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const input = req.body as ProductInput;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw notFound('Товар не знайдено');

    const { brand, category } = await assertTaxonomy(input.brandId, input.categoryId);

    const slug =
      input.slug && input.slug !== existing.slug
        ? await uniqueSlug(input.slug, async (candidate) =>
            Boolean(
              await prisma.product.findFirst({
                where: { slug: candidate, id: { not: id } },
                select: { id: true },
              }),
            ),
          )
        : existing.slug;

    const product = await prisma.product.update({
      where: { id },
      data: { ...toWriteData(input, { brandName: brand.name, categoryName: category.name }), slug },
      include: { brand: true, category: true },
    });

    res.json({ item: serializeProduct(product) });
  }),
);

/**
 * Price and availability edits. A manager is allowed here — it is the one
 * product mutation the role owns — but cannot touch anything else.
 */
const inlineSchema = z.object({
  price: z.coerce.number().min(0.01).max(1_000_000).optional(),
  oldPrice: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  stock: z.coerce.number().int().min(0).max(1_000_000).optional(),
  isActive: z.boolean().optional(),
});

router.patch(
  '/:id/inline',
  validate(inlineSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const input = req.body as z.infer<typeof inlineSchema>;

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { brand: true, category: true },
    });
    if (!existing) throw notFound('Товар не знайдено');

    const price = input.price ?? existing.price;
    const oldPrice = input.oldPrice === undefined ? existing.oldPrice : input.oldPrice;

    const derived = derivedProductFields({
      name: existing.name,
      price,
      oldPrice,
      brandName: existing.brand?.name,
      categoryName: existing.category?.name,
      flavors: existing.flavors,
      description: existing.description,
    });

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...derived,
        stock: input.stock ?? existing.stock,
        isActive: input.isActive ?? existing.isActive,
      },
      include: { brand: true, category: true },
    });

    res.json({ item: serializeProduct(product) });
  }),
);

/** A manager cannot delete; it flags the product for an admin instead. */
router.post(
  '/:id/request-delete',
  asyncHandler(async (req, res) => {
    if (req.user!.role === 'ADMIN') {
      throw badRequest('Адміністратор може видалити товар напряму');
    }
    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: { deleteRequested: true, deleteRequestedBy: req.user!.id, isActive: false },
      include: { brand: true, category: true },
    });
    res.json({
      item: serializeProduct(product),
      message: 'Запит на видалення надіслано адміністратору. Товар приховано з каталогу.',
    });
  }),
);

router.post(
  '/:id/reject-delete',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: { deleteRequested: false, deleteRequestedBy: null, isActive: true },
      include: { brand: true, category: true },
    });
    res.json({ item: serializeProduct(product) });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    // Defence in depth: the role is re-checked here, not only in the router.
    if (req.user!.role !== 'ADMIN') {
      throw forbidden('Видаляти товари може лише адміністратор');
    }

    const id = Number(req.params.id);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw notFound('Товар не знайдено');

    const orderedCount = await prisma.orderItem.count({ where: { productId: id } });
    if (orderedCount > 0) {
      // The product is part of order history: archive instead of destroying it.
      const archived = await prisma.product.update({
        where: { id },
        data: { isActive: false, deleteRequested: false, isFeatured: false, isBestseller: false },
        include: { brand: true, category: true },
      });
      res.json({
        item: serializeProduct(archived),
        archived: true,
        message: 'Товар присутній у замовленнях, тому переведений в архів і прихований з каталогу.',
      });
      return;
    }

    await prisma.product.delete({ where: { id } });
    res.json({ ok: true, archived: false, message: 'Товар видалено' });
  }),
);

/** Bulk discount tool used by the "Акції" screens. */
const bulkDiscountSchema = z
  .object({
    percent: z.coerce.number().int().min(0).max(90),
    productIds: z.array(z.coerce.number().int().positive()).max(500).default([]),
    categoryId: z.coerce.number().int().positive().optional(),
    brandId: z.coerce.number().int().positive().optional(),
  })
  .refine((value) => value.productIds.length > 0 || value.categoryId || value.brandId, {
    message: 'Виберіть товари, категорію або бренд',
  });

router.post(
  '/bulk-discount',
  validate(bulkDiscountSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof bulkDiscountSchema>;

    const where: Prisma.ProductWhereInput = input.productIds.length
      ? { id: { in: input.productIds } }
      : {
          ...(input.categoryId ? { categoryId: input.categoryId } : {}),
          ...(input.brandId ? { brandId: input.brandId } : {}),
        };

    const products = await prisma.product.findMany({
      where,
      include: { brand: true, category: true },
    });
    if (!products.length) throw badRequest('За вибраними умовами товарів не знайдено');

    let updated = 0;
    for (const product of products) {
      // The pre-discount price is the anchor, so re-applying a discount never
      // compounds: 0% restores the original price.
      const basePrice = product.oldPrice ?? product.price;
      const nextPrice = input.percent === 0 ? basePrice : money((basePrice * (100 - input.percent)) / 100);
      const nextOldPrice = input.percent === 0 ? null : basePrice;

      const derived = derivedProductFields({
        name: product.name,
        price: nextPrice,
        oldPrice: nextOldPrice,
        brandName: product.brand?.name,
        categoryName: product.category?.name,
        flavors: product.flavors,
        description: product.description,
      });

      await prisma.product.update({ where: { id: product.id }, data: derived });
      updated += 1;
    }

    res.json({
      updated,
      message:
        input.percent === 0
          ? `Знижку скасовано для ${updated} товар(ів)`
          : `Знижку -${input.percent}% застосовано до ${updated} товар(ів)`,
    });
  }),
);

export default router;
