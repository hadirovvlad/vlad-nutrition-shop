import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgePercent, Search, Tag } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DISCOUNT_STEPS } from '@/lib/constants';
import { formatPrice, productsLabel } from '@/lib/format';
import { useDebounced, useDocumentMeta } from '@/hooks';
import { ApiError, mgmtApi } from '@/services';
import { toast } from '@/store/toast';
import { ProductImage } from '@/components/product/ProductVisual';
import { PanelHeader } from '@/layouts/PanelLayout';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { Cell, DataTable, Row, StatTile } from '@/components/ui/data';
import { Badge, EmptyState, ErrorState, TableSkeleton } from '@/components/ui/feedback';

type Target = 'selection' | 'category' | 'brand';

export function PanelPromotionsPage() {
  useDocumentMeta('Акції — панель');

  const queryClient = useQueryClient();

  const [target, setTarget] = useState<Target>('selection');
  const [percent, setPercent] = useState(20);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [brandId, setBrandId] = useState<number | ''>('');
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);

  const { data: taxonomy } = useQuery({
    queryKey: ['mgmt', 'taxonomy'],
    queryFn: async () => {
      const [categories, brands] = await Promise.all([mgmtApi.categories(), mgmtApi.brands()]);
      return { categories: categories.items, brands: brands.items };
    },
    staleTime: 5 * 60_000,
  });

  const { data: onSale, isLoading: saleLoading } = useQuery({
    queryKey: ['mgmt', 'products', 'onSale'],
    queryFn: () => mgmtApi.products({ onSale: true, limit: 100, sort: 'price-desc' }),
  });

  const { data: searchResults, isLoading: searchLoading, isError, refetch } = useQuery({
    queryKey: ['mgmt', 'products', 'promo-search', debouncedSearch],
    queryFn: () => mgmtApi.products({ q: debouncedSearch || undefined, limit: 20, sort: 'name' }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      mgmtApi.bulkDiscount({
        percent,
        productIds: target === 'selection' ? selected : [],
        categoryId: target === 'category' && categoryId ? Number(categoryId) : undefined,
        brandId: target === 'brand' && brandId ? Number(brandId) : undefined,
      }),
    onSuccess: (result) => {
      toast.success(result.message);
      setSelected([]);
      void queryClient.invalidateQueries({ queryKey: ['mgmt', 'products'] });
      void queryClient.invalidateQueries({ queryKey: ['mgmt', 'stats'] });
      void queryClient.invalidateQueries({ queryKey: ['home'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Не вдалося застосувати знижку');
    },
  });

  const discounted = onSale?.items ?? [];
  const totalSaving = discounted.reduce(
    (sum, product) => sum + ((product.oldPrice ?? product.price) - product.price),
    0,
  );

  const canApply =
    (target === 'selection' && selected.length > 0) ||
    (target === 'category' && categoryId !== '') ||
    (target === 'brand' && brandId !== '');

  return (
    <div>
      <PanelHeader
        title="Акції"
        description="Застосуйте знижку до вибраних товарів, категорії або бренду. Стара ціна ставиться автоматично."
      />

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile
          label="Товарів зі знижкою"
          value={discounted.length}
          icon={<BadgePercent className="size-4" aria-hidden />}
          tone="accent"
        />
        <StatTile
          label="Максимальна знижка"
          value={`−${Math.max(0, ...discounted.map((product) => product.discount))}%`}
        />
        <StatTile label="Сумарна економія клієнта" value={formatPrice(totalSaving)} />
      </div>

      {/* Discount builder */}
      <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-base font-extrabold text-ink">Створити знижку</h2>

        <div className="mt-4 flex flex-wrap gap-2">
          {[...DISCOUNT_STEPS, 50].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setPercent(step)}
              aria-pressed={percent === step}
              className={cn(
                'h-11 rounded-xl px-4 text-sm font-bold transition-colors',
                percent === step
                  ? 'bg-ink text-white'
                  : 'border border-line bg-surface text-ink-soft hover:border-ink hover:text-ink',
              )}
            >
              −{step}%
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPercent(0)}
            aria-pressed={percent === 0}
            className={cn(
              'h-11 rounded-xl px-4 text-sm font-bold transition-colors',
              percent === 0
                ? 'bg-danger text-white'
                : 'border border-line bg-surface text-ink-soft hover:border-danger hover:text-danger',
            )}
          >
            Скасувати знижку
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Select
            label="Застосувати до"
            value={target}
            onChange={(event) => setTarget(event.target.value as Target)}
          >
            <option value="selection">Вибраних товарів</option>
            <option value="category">Усієї категорії</option>
            <option value="brand">Усього бренду</option>
          </Select>

          {target === 'category' ? (
            <Select
              label="Категорія"
              value={categoryId}
              onChange={(event) =>
                setCategoryId(event.target.value ? Number(event.target.value) : '')
              }
            >
              <option value="">Вибрати категорію…</option>
              {(taxonomy?.categories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.parentId ? '— ' : ''}
                  {category.name} ({category.productCount})
                </option>
              ))}
            </Select>
          ) : null}

          {target === 'brand' ? (
            <Select
              label="Бренд"
              value={brandId}
              onChange={(event) => setBrandId(event.target.value ? Number(event.target.value) : '')}
            >
              <option value="">Вибрати бренд…</option>
              {(taxonomy?.brands ?? []).map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name} ({brand.productCount})
                </option>
              ))}
            </Select>
          ) : null}
        </div>

        {target === 'selection' ? (
          <div className="mt-4">
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Знайти товар…"
                aria-label="Пошук товарів для знижки"
                className="h-11 w-full rounded-xl border border-line bg-surface pr-3 pl-10 text-sm outline-none focus:border-ink"
              />
            </div>

            {isError ? (
              <ErrorState className="mt-3" onRetry={() => void refetch()} />
            ) : searchLoading ? (
              <TableSkeleton rows={4} cols={3} />
            ) : (
              <ul className="mt-3 max-h-80 divide-y divide-line overflow-y-auto rounded-xl border border-line">
                {(searchResults?.items ?? []).map((product) => {
                  const checked = selected.includes(product.id);
                  return (
                    <li key={product.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-ground">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelected(
                              checked
                                ? selected.filter((id) => id !== product.id)
                                : [...selected, product.id],
                            )
                          }
                          className="size-[18px] shrink-0 cursor-pointer accent-[var(--color-ink)]"
                        />
                        <span className="size-9 shrink-0 overflow-hidden rounded-lg border border-line bg-ground">
                          <ProductImage
                            src={product.image}
                            name={product.name}
                            slug={product.slug}
                            form={product.form}
                            categorySlug={product.category?.slug ?? null}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-ink">
                            {product.name}
                          </span>
                          <span className="text-[11px] text-ink-faint">
                            {product.brand?.name}
                          </span>
                        </span>
                        <span className="shrink-0 text-[13px] font-bold text-ink tabular-nums">
                          {formatPrice(product.price)}
                        </span>
                        {product.discount > 0 ? (
                          <Badge tone="warn">−{product.discount}%</Badge>
                        ) : null}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            {selected.length > 0 ? (
              <p className="mt-2 text-[13px] font-semibold text-ink">
                Вибрано: {productsLabel(selected.length)}
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="ml-2 font-bold text-danger hover:underline"
                >
                  очистити
                </button>
              </p>
            ) : null}
          </div>
        ) : null}

        <Button
          className="mt-5"
          variant={percent === 0 ? 'danger' : 'accent'}
          disabled={!canApply}
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <Tag className="size-4" aria-hidden />
          {percent === 0 ? 'Скасувати знижку' : `Застосувати −${percent}%`}
        </Button>

        <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
          Знижка завжди розраховується від початкової ціни, тому повторне застосування не
          накопичується.
        </p>
      </section>

      {/* Current promotions */}
      <section className="mt-6">
        <h2 className="mb-4 text-base font-extrabold text-ink">Товари зі знижкою</h2>

        {saleLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : discounted.length === 0 ? (
          <EmptyState
            icon={<BadgePercent className="size-6" aria-hidden />}
            title="Активних акцій немає"
            description="Застосуйте знижку вище, і товари з’являться тут та в розділі «Акції» на сайті."
          />
        ) : (
          <DataTable head={['Товар', 'Стара ціна', 'Нова ціна', 'Знижка', 'Залишок']}>
            {discounted.map((product) => (
              <Row key={product.id}>
                <Cell>
                  <div className="flex items-center gap-3">
                    <span className="size-10 shrink-0 overflow-hidden rounded-lg border border-line bg-ground">
                      <ProductImage
                        src={product.image}
                        name={product.name}
                        slug={product.slug}
                        form={product.form}
                        categorySlug={product.category?.slug ?? null}
                      />
                    </span>
                    <span className="max-w-[18rem] truncate text-[13px] font-bold text-ink">
                      {product.name}
                    </span>
                  </div>
                </Cell>
                <Cell className="whitespace-nowrap text-ink-faint line-through tabular-nums">
                  {product.oldPrice ? formatPrice(product.oldPrice) : '—'}
                </Cell>
                <Cell className="font-bold whitespace-nowrap text-ink tabular-nums">
                  {formatPrice(product.price)}
                </Cell>
                <Cell>
                  <Badge tone="danger">−{product.discount}%</Badge>
                </Cell>
                <Cell className="tabular-nums">{product.stock} шт.</Cell>
              </Row>
            ))}
          </DataTable>
        )}
      </section>
    </div>
  );
}
