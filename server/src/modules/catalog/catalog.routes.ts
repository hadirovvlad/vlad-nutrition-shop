import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { GOALS, PRODUCT_FORMS } from '../../lib/constants';
import { asyncHandler, notFound } from '../../lib/http';
import { parseStringList } from '../../lib/json';
import { serializeBrand, serializeCategory, serializeProduct, serializeReview } from '../../lib/serialize';
import { validate } from '../../middleware/validate';
import { buildProductWhere, productQuerySchema, sortToOrderBy } from './catalog.query';

const router = Router();

const withRelations = { brand: true, category: true } as const;

/** GET /api/catalog/products — the catalog grid, filters and sorting. */
router.get(
  '/products',
  validate(productQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof productQuerySchema>;
    const where = await buildProductWhere(query);

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: withRelations,
        orderBy: sortToOrderBy(query.sort),
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

/** Home page sections in one round trip. */
router.get(
  '/home',
  asyncHandler(async (_req, res) => {
    const base = { isActive: true } as const;
    const [bestsellers, newArrivals, deals, categories, brands, productCount] = await Promise.all([
      prisma.product.findMany({
        where: { ...base, isBestseller: true },
        include: withRelations,
        orderBy: [{ soldCount: 'desc' }],
        take: 8,
      }),
      prisma.product.findMany({
        where: { ...base, isNew: true },
        include: withRelations,
        orderBy: [{ createdAt: 'desc' }],
        take: 8,
      }),
      prisma.product.findMany({
        where: { ...base, discountPercent: { gt: 0 } },
        include: withRelations,
        orderBy: [{ discountPercent: 'desc' }],
        take: 8,
      }),
      prisma.category.findMany({
        where: { parentId: null },
        include: {
          _count: { select: { products: true } },
          children: { include: { _count: { select: { products: true } } } },
        },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.brand.findMany({
        include: { _count: { select: { products: true } } },
        orderBy: { name: 'asc' },
        take: 12,
      }),
      prisma.product.count({ where: base }),
    ]);

    res.json({
      bestsellers: bestsellers.map(serializeProduct),
      newArrivals: newArrivals.map(serializeProduct),
      deals: deals.map(serializeProduct),
      categories: categories.map((category) => serializeCategory(category)),
      brands: brands.map(serializeBrand),
      goals: GOALS,
      productCount,
    });
  }),
);

/** Live search dropdown: products, categories and brands. */
router.get(
  '/search',
  validate(z.object({ q: z.string().trim().max(120).default('') }), 'query'),
  asyncHandler(async (req, res) => {
    const { q } = req.query as unknown as { q: string };
    if (q.length < 2) {
      res.json({ products: [], categories: [], brands: [], total: 0 });
      return;
    }

    const needle = q.toLowerCase();
    const [products, categories, brands, total] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, searchIndex: { contains: needle } },
        include: withRelations,
        orderBy: [{ soldCount: 'desc' }],
        take: 6,
      }),
      prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.brand.findMany({ orderBy: { name: 'asc' } }),
      prisma.product.count({ where: { isActive: true, searchIndex: { contains: needle } } }),
    ]);

    res.json({
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        image: product.image,
        price: product.price,
        oldPrice: product.oldPrice,
        brand: product.brand?.name ?? null,
      })),
      // Category and brand names are short lists; matching them in memory keeps
      // the query Cyrillic-safe without another index column.
      categories: categories
        .filter((category) => category.name.toLowerCase().includes(needle))
        .slice(0, 4)
        .map((category) => ({ id: category.id, name: category.name, slug: category.slug })),
      brands: brands
        .filter((brand) => brand.name.toLowerCase().includes(needle))
        .slice(0, 4)
        .map((brand) => ({ id: brand.id, name: brand.name, slug: brand.slug })),
      total,
    });
  }),
);

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: { _count: { select: { products: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ items: categories.map((category) => serializeCategory(category)) });
  }),
);

router.get(
  '/categories/:slug',
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: {
        children: {
          include: { _count: { select: { products: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { products: true } },
      },
    });
    if (!category) throw notFound('Категорію не знайдено');
    res.json({ item: serializeCategory(category) });
  }),
);

router.get(
  '/brands',
  asyncHandler(async (_req, res) => {
    const brands = await prisma.brand.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ items: brands.map(serializeBrand) });
  }),
);

router.get(
  '/goals',
  asyncHandler(async (_req, res) => {
    res.json({ items: GOALS });
  }),
);

/** Values available for the filter sidebar, derived from live product data. */
router.get(
  '/filters',
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { weights: true, flavors: true, weight: true, flavor: true, form: true, price: true },
    });

    const weights = new Set<string>();
    const flavors = new Set<string>();
    const forms = new Set<string>();
    let minPrice = Number.POSITIVE_INFINITY;
    let maxPrice = 0;

    for (const product of products) {
      parseStringList(product.weights).forEach((value) => weights.add(value));
      parseStringList(product.flavors).forEach((value) => flavors.add(value));
      if (product.weight) weights.add(product.weight);
      if (product.flavor) flavors.add(product.flavor);
      if (product.form) forms.add(product.form);
      minPrice = Math.min(minPrice, product.price);
      maxPrice = Math.max(maxPrice, product.price);
    }

    const byNumber = (a: string, b: string) => {
      const na = Number.parseFloat(a);
      const nb = Number.parseFloat(b);
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
      return a.localeCompare(b, 'uk');
    };

    res.json({
      weights: Array.from(weights).sort(byNumber),
      flavors: Array.from(flavors).sort((a, b) => a.localeCompare(b, 'uk')),
      forms: Array.from(forms).length ? Array.from(forms) : [...PRODUCT_FORMS],
      priceRange: {
        min: Number.isFinite(minPrice) ? Math.floor(minPrice) : 0,
        max: Math.ceil(maxPrice) || 10000,
      },
    });
  }),
);

/** GET /api/catalog/products/:slug — product page payload. */
router.get(
  '/products/:slug',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: withRelations,
    });
    if (!product || !product.isActive) throw notFound('Товар не знайдено');

    const [reviews, related] = await Promise.all([
      prisma.review.findMany({
        where: { productId: product.id, isApproved: true },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.findMany({
        where: {
          isActive: true,
          categoryId: product.categoryId,
          id: { not: product.id },
        },
        include: withRelations,
        orderBy: [{ soldCount: 'desc' }],
        take: 4,
      }),
    ]);

    res.json({
      item: serializeProduct(product),
      reviews: reviews.map(serializeReview),
      related: related.map(serializeProduct),
    });
  }),
);

export default router;
