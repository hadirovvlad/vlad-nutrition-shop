import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { asyncHandler, badRequest, notFound } from '../../lib/http';
import { serializeBrand, serializeCategory } from '../../lib/serialize';
import { uniqueSlug } from '../../lib/slug';
import { requireAdmin, requireStaff } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

/* ------------------------------- categories ------------------------------- */

const categorySchema = z.object({
  name: z.string().trim().min(2, 'Вкажіть назву').max(80),
  slug: z.string().trim().max(80).optional().or(z.literal('')),
  image: z.string().trim().max(500).optional().or(z.literal('')),
  icon: z.string().trim().max(20).optional().or(z.literal('')),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

router.get(
  '/categories',
  requireStaff,
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    // Flattened in tree order: each parent immediately followed by its
    // children, so selects and tables read correctly without client sorting.
    const roots = categories.filter((category) => !category.parentId);
    const ordered = roots.flatMap((root) => [
      root,
      ...categories.filter((category) => category.parentId === root.id),
    ]);
    // Any orphan (parent removed out of band) still has to appear.
    const orphans = categories.filter((category) => !ordered.includes(category));

    res.json({ items: [...ordered, ...orphans].map((category) => serializeCategory(category)) });
  }),
);

router.post(
  '/categories',
  requireAdmin,
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof categorySchema>;

    if (input.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
      if (!parent) throw badRequest('Батьківську категорію не знайдено');
      if (parent.parentId) throw badRequest('Підтримується лише один рівень підкатегорій');
    }

    const slug = await uniqueSlug(input.slug || input.name, async (candidate) =>
      Boolean(await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } })),
    );

    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug,
        image: input.image || null,
        icon: input.icon || null,
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder,
      },
      include: { _count: { select: { products: true } } },
    });

    res.status(201).json({ item: serializeCategory(category) });
  }),
);

router.put(
  '/categories/:id',
  requireAdmin,
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const input = req.body as z.infer<typeof categorySchema>;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw notFound('Категорію не знайдено');
    if (input.parentId === id) throw badRequest('Категорія не може бути своїм батьком');

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug ? input.slug : existing.slug,
        image: input.image || null,
        icon: input.icon || null,
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder,
      },
      include: { _count: { select: { products: true } } },
    });

    res.json({ item: serializeCategory(category) });
  }),
);

router.delete(
  '/categories/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const [productCount, childCount] = await Promise.all([
      prisma.product.count({ where: { categoryId: id } }),
      prisma.category.count({ where: { parentId: id } }),
    ]);
    if (productCount > 0) {
      throw badRequest(`У категорії ${productCount} товар(ів). Перенесіть їх перед видаленням.`);
    }
    if (childCount > 0) {
      throw badRequest('Спочатку видаліть підкатегорії');
    }
    await prisma.category.delete({ where: { id } });
    res.json({ ok: true });
  }),
);

/* --------------------------------- brands --------------------------------- */

const brandSchema = z.object({
  name: z.string().trim().min(2, 'Вкажіть назву').max(80),
  slug: z.string().trim().max(80).optional().or(z.literal('')),
  logo: z.string().trim().max(500).optional().or(z.literal('')),
  country: z.string().trim().max(60).optional().or(z.literal('')),
});

router.get(
  '/brands',
  requireStaff,
  asyncHandler(async (_req, res) => {
    const brands = await prisma.brand.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ items: brands.map(serializeBrand) });
  }),
);

router.post(
  '/brands',
  requireAdmin,
  validate(brandSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof brandSchema>;
    const slug = await uniqueSlug(input.slug || input.name, async (candidate) =>
      Boolean(await prisma.brand.findUnique({ where: { slug: candidate }, select: { id: true } })),
    );

    const brand = await prisma.brand.create({
      data: {
        name: input.name,
        slug,
        logo: input.logo || null,
        country: input.country || null,
      },
      include: { _count: { select: { products: true } } },
    });

    res.status(201).json({ item: serializeBrand(brand) });
  }),
);

router.put(
  '/brands/:id',
  requireAdmin,
  validate(brandSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing) throw notFound('Бренд не знайдено');

    const input = req.body as z.infer<typeof brandSchema>;
    const brand = await prisma.brand.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug ? input.slug : existing.slug,
        logo: input.logo || null,
        country: input.country || null,
      },
      include: { _count: { select: { products: true } } },
    });

    res.json({ item: serializeBrand(brand) });
  }),
);

router.delete(
  '/brands/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const productCount = await prisma.product.count({ where: { brandId: id } });
    if (productCount > 0) {
      throw badRequest(`У бренду ${productCount} товар(ів). Перенесіть їх перед видаленням.`);
    }
    await prisma.brand.delete({ where: { id } });
    res.json({ ok: true });
  }),
);

export default router;
