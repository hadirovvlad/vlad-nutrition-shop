import { useCallback, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import { DISCOUNT_STEPS, SHOP_NAME, SORT_OPTIONS } from '@/lib/constants';
import { productsLabel } from '@/lib/format';
import { useDocumentMeta } from '@/hooks';
import { catalogApi, type CatalogFilters } from '@/services';
import {
  ActiveFilterChips,
  EMPTY_FILTERS,
  FilterSidebar,
  countActiveFilters,
  type FilterValue,
} from '@/components/catalog/FilterSidebar';
import { ProductGrid } from '@/components/product/ProductCard';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { Pagination } from '@/components/ui/data';
import { EmptyState, ErrorState, ProductGridSkeleton } from '@/components/ui/feedback';
import { Sheet } from '@/components/ui/overlay';

const PAGE_SIZE = 12;

/** Filters live in the URL so any catalog view can be shared or bookmarked. */
function parseFilters(params: URLSearchParams): FilterValue {
  const list = (key: string) => {
    const raw = params.get(key);
    return raw ? raw.split(',').filter(Boolean) : [];
  };
  const num = (key: string) => {
    const raw = params.get(key);
    if (raw === null || raw === '') return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return {
    category: list('category'),
    brand: list('brand'),
    goal: list('goal'),
    weight: list('weight'),
    flavor: list('flavor'),
    form: list('form'),
    minPrice: num('minPrice'),
    maxPrice: num('maxPrice'),
    minRating: num('minRating'),
    inStock: params.get('inStock') === 'true',
    onSale: params.get('onSale') === 'true',
  };
}

function writeFilters(
  filters: FilterValue,
  extras: { q?: string; sort?: string; page?: number },
): URLSearchParams {
  const params = new URLSearchParams();

  (['category', 'brand', 'goal', 'weight', 'flavor', 'form'] as const).forEach((key) => {
    if (filters[key].length) params.set(key, filters[key].join(','));
  });
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating));
  if (filters.inStock) params.set('inStock', 'true');
  if (filters.onSale) params.set('onSale', 'true');

  if (extras.q) params.set('q', extras.q);
  if (extras.sort && extras.sort !== 'popular') params.set('sort', extras.sort);
  if (extras.page && extras.page > 1) params.set('page', String(extras.page));

  return params;
}

export type CatalogPreset = {
  title: string;
  description?: string;
  eyebrow?: string;
  force?: Partial<CatalogFilters>;
  defaultSort?: string;
};

export function CatalogPage({ preset }: { preset?: CatalogPreset }) {
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters = useMemo(() => parseFilters(params), [params]);
  const query = params.get('q') ?? '';
  const sort = params.get('sort') ?? preset?.defaultSort ?? 'popular';
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);

  const { data: taxonomy } = useQuery({
    queryKey: ['catalog', 'taxonomy'],
    queryFn: async () => {
      const [categories, brands, goals, meta] = await Promise.all([
        catalogApi.categories(),
        catalogApi.brands(),
        catalogApi.goals(),
        catalogApi.filters(),
      ]);
      return {
        categories: categories.items,
        brands: brands.items,
        goals: goals.items,
        meta,
      };
    },
    staleTime: 5 * 60_000,
  });

  const { data: categoryData } = useQuery({
    queryKey: ['category', categorySlug],
    queryFn: () => catalogApi.category(categorySlug!),
    enabled: Boolean(categorySlug),
  });

  const activeCategory = categoryData?.item;

  const requestFilters: CatalogFilters = useMemo(
    () => ({
      ...filters,
      // A category in the path is authoritative; URL filters add to it.
      category: categorySlug ? [categorySlug, ...filters.category] : filters.category,
      q: query || undefined,
      sort,
      page,
      limit: PAGE_SIZE,
      ...preset?.force,
    }),
    [filters, categorySlug, query, sort, page, preset?.force],
  );

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['products', requestFilters],
    queryFn: ({ signal }) => catalogApi.products(requestFilters, signal),
    placeholderData: (previous) => previous,
  });

  const updateFilters = useCallback(
    (next: FilterValue) => {
      // Any filter change resets pagination — page 5 of a new result set is noise.
      setParams(writeFilters(next, { q: query, sort, page: 1 }));
    },
    [query, sort, setParams],
  );

  const title = preset?.title ?? activeCategory?.name ?? (query ? `Пошук: «${query}»` : 'Каталог');
  const description =
    preset?.description ??
    (activeCategory
      ? `${activeCategory.name} — ${productsLabel(activeCategory.productCount)} в наявності. Оригінальна продукція, доставка по Україні.`
      : `Весь асортимент спортивного харчування ${SHOP_NAME}: протеїн, креатин, амінокислоти, вітаміни та аксесуари.`);

  useDocumentMeta(title, description);

  const activeCount = countActiveFilters(filters);
  const total = data?.total ?? 0;

  const sidebar = taxonomy ? (
    <FilterSidebar
      value={filters}
      onChange={updateFilters}
      categories={taxonomy.categories}
      brands={taxonomy.brands}
      goals={taxonomy.goals}
      meta={taxonomy.meta}
      lockedCategory={categorySlug}
    />
  ) : null;

  return (
    <div className="container-page py-6 sm:py-8">
      {/* Breadcrumbs */}
      <nav aria-label="Навігація" className="mb-4 flex items-center gap-1.5 text-[13px]">
        <Link to="/" className="text-ink-muted hover:text-ink">
          Головна
        </Link>
        <ChevronRight className="size-3.5 text-ink-faint" aria-hidden />
        {activeCategory ? (
          <>
            <Link to="/catalog" className="text-ink-muted hover:text-ink">
              Каталог
            </Link>
            <ChevronRight className="size-3.5 text-ink-faint" aria-hidden />
            <span className="font-semibold text-ink">{activeCategory.name}</span>
          </>
        ) : (
          <span className="font-semibold text-ink">{title}</span>
        )}
      </nav>

      <header className="mb-5">
        {preset?.eyebrow ? (
          <p className="mb-1.5 text-[11px] font-bold tracking-[0.12em] text-ink-faint uppercase">
            {preset.eyebrow}
          </p>
        ) : null}
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-extrabold text-ink sm:text-[40px]">{title}</h1>
          {!isLoading ? (
            <span className="text-sm font-medium text-ink-muted">
              Знайдено {productsLabel(total)}
            </span>
          ) : null}
        </div>
        {activeCategory?.children?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeCategory.children.map((child) => (
              <Link
                key={child.id}
                to={`/catalog/${child.slug}`}
                className="rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-soft transition-colors hover:border-ink hover:text-ink"
              >
                {child.name}
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-28 rounded-2xl border border-line bg-surface px-4 py-2">
            {sidebar}
          </div>
        </aside>

        <div className="min-w-0">
          {/* Toolbar */}
          <div className="mb-4 flex items-center gap-3">
            <Button
              variant="outline"
              className="lg:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              Фільтри
              {activeCount > 0 ? (
                <span className="ml-0.5 rounded-full bg-ink px-1.5 py-0.5 text-[10px] leading-none text-white tabular-nums">
                  {activeCount}
                </span>
              ) : null}
            </Button>

            <div className="ml-auto w-full max-w-[15rem]">
              <Select
                aria-label="Сортування"
                value={sort}
                onChange={(event) =>
                  setParams(writeFilters(filters, { q: query, sort: event.target.value, page: 1 }))
                }
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <ActiveFilterChips
            value={filters}
            onChange={updateFilters}
            categories={taxonomy?.categories ?? []}
            brands={taxonomy?.brands ?? []}
            goals={taxonomy?.goals ?? []}
          />

          {isError ? (
            <ErrorState
              description="Не вдалося завантажити товари."
              onRetry={() => void refetch()}
            />
          ) : isLoading ? (
            <ProductGridSkeleton count={PAGE_SIZE} />
          ) : total === 0 ? (
            <EmptyState
              title="Товарів не знайдено"
              description={
                // A preset view (sale, new arrivals) narrows results too, so an
                // empty result there is not "this category is empty".
                activeCount > 0 || query || params.toString()
                  ? 'Спробуйте зняти частину фільтрів або змінити запит.'
                  : 'У цій категорії ще немає товарів.'
              }
              action={
                activeCount > 0 || query || params.toString() ? (
                  <Button onClick={() => setParams(new URLSearchParams())}>
                    Скинути фільтри
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              <div
                className={
                  isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'
                }
              >
                <ProductGrid products={data!.items} />
              </div>

              <Pagination
                page={data!.page}
                pages={data!.pages}
                onChange={(next) =>
                  setParams(writeFilters(filters, { q: query, sort, page: next }))
                }
                className="mt-10"
              />
            </>
          )}
        </div>
      </div>

      {/* Mobile filter panel */}
      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Фільтри"
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                updateFilters({ ...EMPTY_FILTERS });
              }}
            >
              Скинути
            </Button>
            <Button fullWidth onClick={() => setFiltersOpen(false)}>
              Показати {productsLabel(total)}
            </Button>
          </div>
        }
      >
        {sidebar}
      </Sheet>
    </div>
  );
}

/* --------------------------- preset catalog views ------------------------- */

export function SalePage() {
  const [params, setParams] = useSearchParams();
  const min = Number(params.get('min') ?? 0) || 0;

  const setMin = (next: number) => {
    const updated = new URLSearchParams(params);
    if (next > 0) updated.set('min', String(next));
    else updated.delete('min');
    updated.delete('page');
    setParams(updated);
  };

  return (
    <>
      {/* Discount buckets from the spec: -10, -20, -30, -40. */}
      <div className="container-page pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-ink-muted">Розмір знижки:</span>
          {[0, ...DISCOUNT_STEPS].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setMin(step)}
              aria-pressed={min === step}
              className={
                min === step
                  ? 'rounded-xl bg-ink px-3.5 py-2 text-[13px] font-bold text-white'
                  : 'rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-bold text-ink-soft transition-colors hover:border-ink hover:text-ink'
              }
            >
              {step === 0 ? 'Усі' : `від −${step}%`}
            </button>
          ))}
        </div>
      </div>

      <CatalogPage
        preset={{
          eyebrow: 'Знижки',
          title: 'Гарячі пропозиції',
          description:
            min > 0
              ? `Товари зі знижкою від ${min}%. Знижка розраховується автоматично від старої ціни.`
              : 'Товари зі знижкою. Знижка розраховується автоматично від старої та нової ціни.',
          force: min > 0 ? { onSale: true, minDiscount: min } : { onSale: true },
          defaultSort: 'discount',
        }}
      />
    </>
  );
}

export function NewArrivalsPage() {
  return (
    <CatalogPage
      preset={{
        eyebrow: 'Асортимент',
        title: 'Новинки',
        description: 'Позиції, які щойно з’явилися на складі.',
        force: { isNew: true },
        defaultSort: 'new',
      }}
    />
  );
}
