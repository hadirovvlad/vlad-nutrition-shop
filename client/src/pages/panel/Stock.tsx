import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { useDebounced, useDocumentMeta } from '@/hooks';
import { ApiError, mgmtApi } from '@/services';
import { toast } from '@/store/toast';
import { ProductImage } from '@/components/product/ProductVisual';
import { PanelHeader } from '@/layouts/PanelLayout';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Field';
import { Cell, DataTable, Pagination, Row } from '@/components/ui/data';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/feedback';
import type { Product } from '@/types';

/**
 * Stock and price editing in one table. This is the screen a manager owns:
 * the inline endpoint is the only product mutation their role is allowed.
 */
export function PanelStockPage() {
  useDocumentMeta('Склад — панель');

  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState(params.get('q') ?? '');
  const debouncedSearch = useDebounced(search, 350);
  const lowOnly = params.get('lowStock') === 'true';
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['mgmt', 'stock', debouncedSearch, lowOnly, page],
    queryFn: () =>
      mgmtApi.products({
        q: debouncedSearch || undefined,
        lowStock: lowOnly || undefined,
        sort: lowOnly ? 'stock' : 'name',
        page,
        limit: 20,
      }),
    placeholderData: (previous) => previous,
  });

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  return (
    <div>
      <PanelHeader
        title="Склад"
        description="Змінюйте ціну та залишки прямо в таблиці. Зміни одразу видно в каталозі."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setParam('q', event.target.value || null);
            }}
            placeholder="Назва товару…"
            aria-label="Пошук товарів"
            className="h-11 w-full rounded-xl border border-line bg-surface pr-3 pl-10 text-sm outline-none focus:border-ink"
          />
        </div>

        <Checkbox
          label="Тільки ті, що закінчуються"
          checked={lowOnly}
          onChange={(event) => setParam('lowStock', event.target.checked ? 'true' : null)}
        />
      </div>

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading ? (
        <TableSkeleton rows={10} cols={5} />
      ) : data!.items.length === 0 ? (
        <EmptyState title="Товарів не знайдено" />
      ) : (
        <>
          <DataTable head={['Товар', 'Ціна, ₴', 'Стара ціна, ₴', 'Залишок', 'У каталозі', '']}>
            {data!.items.map((product) => (
              <StockRow
                key={product.id}
                product={product}
                onSaved={() => {
                  void queryClient.invalidateQueries({ queryKey: ['mgmt', 'stock'] });
                  void queryClient.invalidateQueries({ queryKey: ['mgmt', 'products'] });
                  void queryClient.invalidateQueries({ queryKey: ['mgmt', 'stats'] });
                }}
              />
            ))}
          </DataTable>

          <Pagination
            page={data!.page}
            pages={data!.pages}
            onChange={(next) => setParam('page', String(next))}
            className="mt-6"
          />
        </>
      )}
    </div>
  );
}

function StockRow({ product, onSaved }: { product: Product; onSaved: () => void }) {
  const [price, setPrice] = useState(String(product.price));
  const [oldPrice, setOldPrice] = useState(product.oldPrice ? String(product.oldPrice) : '');
  const [stock, setStock] = useState(String(product.stock));
  const [isActive, setIsActive] = useState(product.isActive);

  // Re-sync when the query refetches with new server values.
  useEffect(() => {
    setPrice(String(product.price));
    setOldPrice(product.oldPrice ? String(product.oldPrice) : '');
    setStock(String(product.stock));
    setIsActive(product.isActive);
  }, [product.price, product.oldPrice, product.stock, product.isActive]);

  const dirty =
    Number(price.replace(',', '.')) !== product.price ||
    (oldPrice.trim() === '' ? null : Number(oldPrice.replace(',', '.'))) !==
      product.oldPrice ||
    Number(stock) !== product.stock ||
    isActive !== product.isActive;

  const mutation = useMutation({
    mutationFn: () =>
      mgmtApi.patchProduct(product.id, {
        price: Number(price.replace(',', '.')),
        oldPrice: oldPrice.trim() === '' ? null : Number(oldPrice.replace(',', '.')),
        stock: Number(stock),
        isActive,
      }),
    onSuccess: (result) => {
      toast.success('Збережено ✓', `${result.item.name}: ${formatPrice(result.item.price)}`);
      onSaved();
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Не вдалося зберегти');
    },
  });

  const field =
    'h-10 w-24 rounded-xl border border-line bg-surface px-2.5 text-right text-sm tabular-nums outline-none focus:border-ink';

  return (
    <Row>
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
          <span className="min-w-0">
            <span className="block max-w-[18rem] truncate text-[13px] font-bold text-ink">
              {product.name}
            </span>
            <span className="block text-[11px] text-ink-faint">
              {product.brand?.name}
              {product.weight ? ` · ${product.weight}` : ''}
            </span>
          </span>
        </div>
      </Cell>

      <Cell>
        <input
          value={price}
          inputMode="decimal"
          aria-label={`Ціна ${product.name}`}
          onChange={(event) => setPrice(event.target.value)}
          className={field}
        />
      </Cell>

      <Cell>
        <input
          value={oldPrice}
          inputMode="decimal"
          placeholder="—"
          aria-label={`Стара ціна ${product.name}`}
          onChange={(event) => setOldPrice(event.target.value)}
          className={field}
        />
      </Cell>

      <Cell>
        <input
          value={stock}
          type="number"
          min={0}
          aria-label={`Залишок ${product.name}`}
          onChange={(event) => setStock(event.target.value)}
          className={cn(
            field,
            'w-20',
            Number(stock) === 0
              ? 'border-danger text-danger'
              : Number(stock) <= 10
                ? 'border-warn text-warn'
                : '',
          )}
        />
      </Cell>

      <Cell align="center">
        <input
          type="checkbox"
          checked={isActive}
          aria-label={`Показувати ${product.name} в каталозі`}
          onChange={(event) => setIsActive(event.target.checked)}
          className="size-[18px] cursor-pointer accent-[var(--color-ink)]"
        />
      </Cell>

      <Cell>
        <Button
          size="sm"
          variant={dirty ? 'primary' : 'ghost'}
          disabled={!dirty}
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {!mutation.isPending ? <Check className="size-3.5" aria-hidden /> : null}
          Зберегти
        </Button>
      </Cell>
    </Row>
  );
}
