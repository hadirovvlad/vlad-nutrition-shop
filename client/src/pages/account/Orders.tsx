import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Package, RotateCcw } from 'lucide-react';
import { DELIVERY_LABEL, ORDER_STATUS_LABEL, PAYMENT_LABEL } from '@/lib/constants';
import { formatDateTime, formatPrice, productsLabel } from '@/lib/format';
import { useDocumentMeta } from '@/hooks';
import { accountApi, catalogApi } from '@/services';
import { useCartStore } from '@/store/cart';
import { toast } from '@/store/toast';
import { OrderProgress, OrderStatusBadge } from '@/components/OrderStatusBadge';
import { ProductImage } from '@/components/product/ProductVisual';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/data';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import type { Order, OrderStatus } from '@/types';

type Filter = 'all' | 'active' | 'completed' | 'cancelled';

const ACTIVE_STATUSES: OrderStatus[] = ['NEW', 'CONFIRMING', 'PROCESSING', 'SHIPPED'];

export function AccountOrdersPage() {
  useDocumentMeta('Мої замовлення');

  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['account', 'orders'],
    queryFn: () => accountApi.orders(),
  });

  const orders = data?.items ?? [];

  const matches = (order: Order) => {
    if (filter === 'active') return ACTIVE_STATUSES.includes(order.status);
    if (filter === 'completed') return order.status === 'COMPLETED';
    if (filter === 'cancelled') return order.status === 'CANCELLED';
    return true;
  };

  const filtered = orders.filter(matches);

  if (isError) {
    return <ErrorState description="Не вдалося завантажити замовлення." onRetry={() => void refetch()} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-11 w-64" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<Package className="size-6" aria-hidden />}
        title="Замовлень ще немає"
        description="Коли ви оформите перше замовлення, воно з’явиться тут разом зі статусом доставки."
        action={<ButtonLink to="/catalog">Перейти до каталогу</ButtonLink>}
      />
    );
  }

  return (
    <div>
      <Tabs
        tabs={[
          { value: 'all', label: 'Усі', count: orders.length },
          {
            value: 'active',
            label: 'Активні',
            count: orders.filter((order) => ACTIVE_STATUSES.includes(order.status)).length,
          },
          {
            value: 'completed',
            label: 'Виконані',
            count: orders.filter((order) => order.status === 'COMPLETED').length,
          },
          {
            value: 'cancelled',
            label: 'Скасовані',
            count: orders.filter((order) => order.status === 'CANCELLED').length,
          },
        ]}
        active={filter}
        onChange={setFilter}
        className="mb-4"
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="Тут поки порожньо"
          description={`Немає замовлень у категорії «${
            filter === 'active' ? 'Активні' : filter === 'completed' ? 'Виконані' : 'Скасовані'
          }».`}
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((order) => (
            <li key={order.id}>
              <Link
                to={`/account/orders/${order.id}`}
                className="block rounded-2xl border border-line bg-surface p-4 transition-[border-color,box-shadow] hover:border-ink hover:shadow-soft sm:p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-base font-extrabold text-ink">№{order.number}</span>
                  <OrderStatusBadge status={order.status} />
                  <span className="text-[13px] text-ink-muted">
                    {formatDateTime(order.createdAt)}
                  </span>
                  <span className="ml-auto text-lg font-extrabold text-ink tabular-nums">
                    {formatPrice(order.total)}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {order.items.slice(0, 4).map((item) => (
                    <span
                      key={item.id}
                      className="size-11 shrink-0 overflow-hidden rounded-lg border border-line bg-ground"
                    >
                      <ProductImage
                        src={item.image}
                        name={item.name}
                        slug={item.slug ?? String(item.id)}
                      />
                    </span>
                  ))}
                  <span className="text-[13px] text-ink-muted">
                    {productsLabel(order.items.reduce((sum, item) => sum + item.quantity, 0))}
                    {order.items.length > 4 ? ` · ще ${order.items.length - 4}` : ''}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------ order details ----------------------------- */

export function AccountOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const addToCart = useCartStore((state) => state.add);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['account', 'order', id],
    queryFn: () => accountApi.order(Number(id)),
    enabled: Boolean(id),
    retry: false,
  });

  useDocumentMeta(data ? `Замовлення №${data.item.number}` : 'Замовлення');

  /** Re-order: pulls each line's current product and refills the cart. */
  const reorder = async () => {
    if (!data) return;
    let added = 0;
    for (const item of data.item.items) {
      if (!item.slug) continue;
      try {
        const response = await catalogApi.product(item.slug);
        if (!response.item.inStock) continue;
        addToCart(response.item, {
          quantity: item.quantity,
          weight: item.weight,
          flavor: item.flavor,
        });
        added += 1;
      } catch {
        // A product that no longer exists is simply skipped.
      }
    }
    if (added > 0) toast.success(`Додано в кошик: ${productsLabel(added)}`);
    else toast.error('Жоден товар із цього замовлення зараз недоступний');
  };

  if (isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;

  if (isError || !data) {
    return (
      <ErrorState
        title="Замовлення не знайдено"
        description="Можливо, воно належить іншому акаунту."
        onRetry={() => void refetch()}
      />
    );
  }

  const order = data.item;

  return (
    <div className="space-y-5">
      <Link
        to="/account/orders"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        До списку замовлень
      </Link>

      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-extrabold text-ink">Замовлення №{order.number}</h2>
          <OrderStatusBadge status={order.status} />
          <span className="ml-auto text-[13px] text-ink-muted">
            {formatDateTime(order.createdAt)}
          </span>
        </div>

        <div className="mt-6 overflow-x-auto pb-1">
          <div className="min-w-[30rem]">
            <OrderProgress status={order.status} />
          </div>
        </div>

        {order.status === 'NEW' ? (
          <p className="mt-5 rounded-xl bg-info-soft px-4 py-3 text-[13px] text-info">
            Замовлення прийнято. Менеджер зателефонує для підтвердження.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h3 className="mb-4 text-lg font-extrabold text-ink">Товари</h3>
        <ul className="divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="size-14 shrink-0 overflow-hidden rounded-xl border border-line bg-ground">
                <ProductImage
                  src={item.image}
                  name={item.name}
                  slug={item.slug ?? String(item.id)}
                />
              </span>
              <span className="min-w-0 flex-1">
                {item.slug ? (
                  <Link
                    to={`/product/${item.slug}`}
                    className="line-clamp-2-safe text-sm font-bold text-ink hover:underline"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <span className="text-sm font-bold text-ink">{item.name}</span>
                )}
                <span className="mt-0.5 block text-[12px] text-ink-muted">
                  {[item.weight, item.flavor].filter(Boolean).join(' · ')}
                  {item.weight || item.flavor ? ' · ' : ''}
                  {formatPrice(item.price)} × {item.quantity}
                </span>
              </span>
              <span className="shrink-0 text-sm font-extrabold text-ink tabular-nums">
                {formatPrice(item.lineTotal)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
          <span className="font-extrabold text-ink">Разом</span>
          <span className="text-2xl font-black text-ink tabular-nums">
            {formatPrice(order.total)}
          </span>
        </div>

        <Button variant="outline" className="mt-4" onClick={reorder}>
          <RotateCcw className="size-4" aria-hidden />
          Замовити ще раз
        </Button>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="mb-3 text-sm font-extrabold text-ink">Доставка</h3>
          <dl className="space-y-2 text-[13px]">
            <Row label="Спосіб" value={DELIVERY_LABEL[order.deliveryMethod]} />
            {order.city ? <Row label="Місто" value={order.city} /> : null}
            {order.warehouse ? <Row label="Відділення" value={order.warehouse} /> : null}
            <Row label="Отримувач" value={`${order.firstName} ${order.lastName}`} />
            <Row label="Телефон" value={order.phone} />
          </dl>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="mb-3 text-sm font-extrabold text-ink">Оплата</h3>
          <dl className="space-y-2 text-[13px]">
            <Row label="Спосіб" value={PAYMENT_LABEL[order.paymentMethod]} />
            <Row label="Сума" value={formatPrice(order.total)} />
            <Row label="Статус замовлення" value={ORDER_STATUS_LABEL[order.status]} />
            {order.manager ? <Row label="Ваш менеджер" value={order.manager.name} /> : null}
          </dl>
          {order.comment ? (
            <p className="mt-3 rounded-xl bg-ground p-3 text-[13px] text-ink-soft">
              <span className="font-semibold text-ink">Коментар: </span>
              {order.comment}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}
