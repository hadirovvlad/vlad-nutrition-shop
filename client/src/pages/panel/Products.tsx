import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, Pencil, Plus, Search, Trash2, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { useDebounced, useDocumentMeta } from '@/hooks';
import { ApiError, mgmtApi } from '@/services';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { ProductImage } from '@/components/product/ProductVisual';
import { PanelHeader } from '@/layouts/PanelLayout';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { Badge, EmptyState, ErrorState, TableSkeleton } from '@/components/ui/feedback';
import { Cell, DataTable, Pagination, Row } from '@/components/ui/data';
import { ConfirmDialog } from '@/components/ui/overlay';
import type { Product } from '@/types';

export function PanelProductsPage({ base }: { base: string }) {
  useDocumentMeta('Товари — панель');

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const debouncedSearch = useDebounced(search, 350);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const categoryId = params.get('categoryId') ? Number(params.get('categoryId')) : undefined;
  const brandId = params.get('brandId') ? Number(params.get('brandId')) : undefined;
  const sort = params.get('sort') ?? 'new';

  const { data: taxonomy } = useQuery({
    queryKey: ['mgmt', 'taxonomy'],
    queryFn: async () => {
      const [categories, brands] = await Promise.all([mgmtApi.categories(), mgmtApi.brands()]);
      return { categories: categories.items, brands: brands.items };
    },
    staleTime: 5 * 60_000,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['mgmt', 'products', debouncedSearch, categoryId, brandId, sort, page],
    queryFn: () =>
      mgmtApi.products({
        q: debouncedSearch || undefined,
        categoryId,
        brandId,
        sort,
        page,
        limit: 20,
      }),
    placeholderData: (previous) => previous,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['mgmt', 'products'] });
    void queryClient.invalidateQueries({ queryKey: ['mgmt', 'stats'] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mgmtApi.deleteProduct(id),
    onSuccess: (result) => {
      toast.success(result.message);
      setDeleting(null);
      invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Не вдалося видалити товар');
      setDeleting(null);
    },
  });

  const requestDeleteMutation = useMutation({
    mutationFn: (id: number) => mgmtApi.requestProductDelete(id),
    onSuccess: (result) => {
      toast.info(result.message);
      setDeleting(null);
      invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Не вдалося надіслати запит');
      setDeleting(null);
    },
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
        title="Товари"
        description={
          isAdmin
            ? 'Повне керування каталогом: створення, редагування, видалення.'
            : 'Ви можете змінювати ціну та наявність. Видалення потребує дозволу адміністратора.'
        }
        actions={
          isAdmin ? (
            <Button onClick={() => navigate(`${base}/products/new`)}>
              <Plus className="size-4" aria-hidden />
              Створити товар
            </Button>
          ) : null
        }
      />

      {/* Filters */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
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

        <Select
          aria-label="Категорія"
          value={categoryId ?? ''}
          onChange={(event) => setParam('categoryId', event.target.value || null)}
        >
          <option value="">Всі категорії</option>
          {(taxonomy?.categories ?? []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.parentId ? '— ' : ''}
              {category.name}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Бренд"
          value={brandId ?? ''}
          onChange={(event) => setParam('brandId', event.target.value || null)}
        >
          <option value="">Всі бренди</option>
          {(taxonomy?.brands ?? []).map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Сортування"
          value={sort}
          onChange={(event) => setParam('sort', event.target.value)}
        >
          <option value="new">Спочатку нові</option>
          <option value="name">За назвою</option>
          <option value="stock">Найменший залишок</option>
          <option value="price-asc">Дешевші</option>
          <option value="price-desc">Дорожчі</option>
        </Select>
      </div>

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : data!.items.length === 0 ? (
        <EmptyState
          title="Товарів не знайдено"
          description="Змініть фільтри або створіть новий товар."
          action={
            isAdmin ? (
              <Button onClick={() => navigate(`${base}/products/new`)}>Створити товар</Button>
            ) : null
          }
        />
      ) : (
        <>
          <DataTable head={['Товар', 'Категорія', 'Ціна', 'Залишок', 'Статус', 'Дії']}>
            {data!.items.map((product) => (
              <Row key={product.id}>
                <Cell>
                  <div className="flex items-center gap-3">
                    <span className="size-11 shrink-0 overflow-hidden rounded-lg border border-line bg-ground">
                      <ProductImage
                        src={product.image}
                        name={product.name}
                        slug={product.slug}
                        form={product.form}
                        categorySlug={product.category?.slug ?? null}
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block max-w-[16rem] truncate text-[13px] font-bold text-ink">
                        {product.name}
                      </span>
                      <span className="block text-[11px] text-ink-faint">
                        {product.brand?.name}
                        {product.weight ? ` · ${product.weight}` : ''}
                      </span>
                    </span>
                  </div>
                </Cell>
                <Cell className="text-[13px] whitespace-nowrap">{product.category?.name}</Cell>
                <Cell>
                  <span className="block text-[13px] font-bold whitespace-nowrap text-ink tabular-nums">
                    {formatPrice(product.price)}
                  </span>
                  {product.oldPrice ? (
                    <span className="block text-[11px] whitespace-nowrap text-ink-faint line-through tabular-nums">
                      {formatPrice(product.oldPrice)}
                    </span>
                  ) : null}
                </Cell>
                <Cell>
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                      product.stock === 0
                        ? 'bg-danger-soft text-danger'
                        : product.stock <= 10
                          ? 'bg-warn-soft text-warn'
                          : 'bg-ok-soft text-ok',
                    )}
                  >
                    {product.stock} шт.
                  </span>
                </Cell>
                <Cell>
                  <div className="flex flex-wrap gap-1">
                    {!product.isActive ? <Badge tone="muted">Прихований</Badge> : null}
                    {product.deleteRequested ? <Badge tone="danger">Запит на видалення</Badge> : null}
                    {product.discount > 0 ? <Badge tone="warn">−{product.discount}%</Badge> : null}
                    {product.isNew ? <Badge tone="ink">Новинка</Badge> : null}
                    {product.isBestseller ? <Badge tone="lime">Хіт</Badge> : null}
                  </div>
                </Cell>
                <Cell>
                  <div className="flex items-center gap-1">
                    {isAdmin ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`${base}/products/${product.id}`)}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        Змінити
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`${base}/stock?q=${encodeURIComponent(product.name)}`)}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        Ціна / залишок
                      </Button>
                    )}

                    <Link
                      to={`/product/${product.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Відкрити на сайті"
                      className="flex size-9 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-ground hover:text-ink"
                    >
                      <ExternalLink className="size-4" aria-hidden />
                    </Link>

                    <button
                      type="button"
                      onClick={() => setDeleting(product)}
                      aria-label={isAdmin ? 'Видалити товар' : 'Запросити видалення'}
                      className="flex size-9 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </Cell>
              </Row>
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

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          if (isAdmin) deleteMutation.mutate(deleting.id);
          else requestDeleteMutation.mutate(deleting.id);
        }}
        title={isAdmin ? 'Видалити товар?' : 'Надіслати запит на видалення?'}
        description={
          isAdmin
            ? `«${deleting?.name}» буде видалено. Якщо товар присутній у замовленнях, він перейде в архів, щоб не зламати історію.`
            : `Менеджер не може видаляти товари. «${deleting?.name}» буде прихований з каталогу, а адміністратор отримає запит на видалення.`
        }
        confirmLabel={isAdmin ? 'Видалити' : 'Надіслати запит'}
        loading={deleteMutation.isPending || requestDeleteMutation.isPending}
      />
    </div>
  );
}

/* --------------------------- admin: delete requests ----------------------- */

export function DeleteRequestsCard({ base }: { base: string }) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['mgmt', 'delete-requests'],
    queryFn: () => mgmtApi.deleteRequests(),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => mgmtApi.rejectProductDelete(id),
    onSuccess: () => {
      toast.success('Запит відхилено, товар повернуто в каталог');
      void queryClient.invalidateQueries({ queryKey: ['mgmt', 'delete-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['mgmt', 'products'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => mgmtApi.deleteProduct(id),
    onSuccess: (result) => {
      toast.success(result.message);
      void queryClient.invalidateQueries({ queryKey: ['mgmt', 'delete-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['mgmt', 'products'] });
    },
  });

  const requests = data?.items ?? [];
  if (requests.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-warn-soft bg-warn-soft/40 p-5">
      <h2 className="flex items-center gap-2 text-base font-extrabold text-ink">
        <TriangleAlert className="size-4 text-warn" aria-hidden />
        Запити менеджерів на видалення ({requests.length})
      </h2>

      <ul className="mt-4 space-y-2">
        {requests.map((product) => (
          <li
            key={product.id}
            className="flex flex-wrap items-center gap-3 rounded-xl bg-surface p-3"
          >
            <Link
              to={`${base}/products/${product.id}`}
              className="flex-1 text-[13px] font-bold text-ink hover:underline"
            >
              {product.name}
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={() => rejectMutation.mutate(product.id)}
              loading={rejectMutation.isPending}
            >
              <X className="size-3.5" aria-hidden />
              Відхилити
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => approveMutation.mutate(product.id)}
              loading={approveMutation.isPending}
            >
              <Check className="size-3.5" aria-hidden />
              Видалити
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
