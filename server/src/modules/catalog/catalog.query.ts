import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../prisma';

const csv = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (!value) return [] as string[];
    const list = Array.isArray(value) ? value : value.split(',');
    return list.map((item) => item.trim()).filter(Boolean);
  });

const bool = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((value) => value === true || value === 'true' || value === '1');

export const SORT_OPTIONS = [
  'popular',
  'new',
  'price-asc',
  'price-desc',
  'rating',
  'discount',
] as const;

export const productQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: csv,
  brand: csv,
  goal: csv,
  weight: csv,
  flavor: csv,
  form: csv,
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minDiscount: z.coerce.number().int().min(0).max(90).optional(),
  inStock: bool,
  onSale: bool,
  isNew: bool,
  isBestseller: bool,
  sort: z.enum(SORT_OPTIONS).default('popular'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(12),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

const ORDER_BY: Record<(typeof SORT_OPTIONS)[number], Prisma.ProductOrderByWithRelationInput[]> = {
  popular: [{ soldCount: 'desc' }, { rating: 'desc' }, { id: 'asc' }],
  new: [{ createdAt: 'desc' }, { id: 'desc' }],
  'price-asc': [{ price: 'asc' }, { id: 'asc' }],
  'price-desc': [{ price: 'desc' }, { id: 'asc' }],
  rating: [{ rating: 'desc' }, { reviewCount: 'desc' }, { id: 'asc' }],
  discount: [{ discountPercent: 'desc' }, { id: 'asc' }],
};

export function sortToOrderBy(sort: ProductQuery['sort']) {
  return ORDER_BY[sort];
}

/**
 * A category filter includes that category's subcategories, so /catalog/protein
 * lists everything under Протеїн.
 */
async function resolveCategoryIds(slugs: string[]): Promise<number[] | null> {
  if (!slugs.length) return null;
  const categories = await prisma.category.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, children: { select: { id: true } } },
  });
  const ids = categories.flatMap((category) => [
    category.id,
    ...category.children.map((child) => child.id),
  ]);
  // An unknown slug must yield zero results, never "everything".
  return ids.length ? Array.from(new Set(ids)) : [-1];
}

/** JSON list columns are matched as substrings of the encoded array. */
const jsonContains = (field: 'weights' | 'flavors' | 'goals', values: string[]) =>
  values.map((value) => ({ [field]: { contains: `"${value}"` } }) as Prisma.ProductWhereInput);

export async function buildProductWhere(
  query: ProductQuery,
  options: { includeInactive?: boolean } = {},
): Promise<Prisma.ProductWhereInput> {
  const and: Prisma.ProductWhereInput[] = [];

  if (!options.includeInactive) and.push({ isActive: true });

  const categoryIds = await resolveCategoryIds(query.category);
  if (categoryIds) and.push({ categoryId: { in: categoryIds } });

  if (query.brand.length) and.push({ brand: { slug: { in: query.brand } } });

  if (query.q) {
    const needle = query.q.toLowerCase();
    and.push({ searchIndex: { contains: needle } });
  }

  if (query.minPrice !== undefined) and.push({ price: { gte: query.minPrice } });
  if (query.maxPrice !== undefined) and.push({ price: { lte: query.maxPrice } });
  if (query.minRating !== undefined) and.push({ rating: { gte: query.minRating } });

  if (query.inStock) and.push({ stock: { gt: 0 } });
  if (query.onSale) and.push({ discountPercent: { gt: 0 } });
  if (query.minDiscount !== undefined) and.push({ discountPercent: { gte: query.minDiscount } });
  if (query.isNew) and.push({ isNew: true });
  if (query.isBestseller) and.push({ isBestseller: true });

  if (query.form.length) and.push({ form: { in: query.form } });

  if (query.weight.length) {
    and.push({ OR: [{ weight: { in: query.weight } }, ...jsonContains('weights', query.weight)] });
  }
  if (query.flavor.length) {
    and.push({ OR: [{ flavor: { in: query.flavor } }, ...jsonContains('flavors', query.flavor)] });
  }
  if (query.goal.length) {
    and.push({ OR: jsonContains('goals', query.goal) });
  }

  return and.length ? { AND: and } : {};
}
