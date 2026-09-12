import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Banknote,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { ORDER_STATUS_LABEL } from '@/lib/constants';
import { formatDateKey, formatPrice } from '@/lib/format';
import { useDocumentMeta } from '@/hooks';
import { mgmtApi } from '@/services';
import { useAuth } from '@/store/auth';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { PanelHeader } from '@/layouts/PanelLayout';
import { StatTile } from '@/components/ui/data';
import { ErrorState, Skeleton } from '@/components/ui/feedback';
import type { OrderStatus } from '@/types';

export function PanelDashboardPage({ base }: { base: string }) {
  const { user } = useAuth();
  useDocumentMeta(base === '/admin' ? 'Dashboard — Адмін' : 'Dashboard — Менеджер');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['mgmt', 'stats'],
    queryFn: () => mgmtApi.stats(),
    refetchInterval: 60_000,
  });

  if (isError) {
    return <ErrorState description="Не вдалося завантажити статистику." onRetry={() => void refetch()} />;
  }

  const maxRevenue = Math.max(1, ...(data?.daily ?? []).map((day) => day.revenue));

  return (
    <div>
      <PanelHeader
        title={`Вітаємо, ${user?.name.split(' ')[0] ?? ''}`}
        description="Огляд магазину за весь час роботи."
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Primary numbers */}
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <StatTile
              label="Замовлень"
              value={data!.orderCount}
              hint={`Нових: ${data!.byStatus.NEW}`}
              icon={<ShoppingCart className="size-4" aria-hidden />}
            />
            <StatTile
              label="Оборот"
              value={formatPrice(data!.revenue)}
              hint={`Середній чек ${formatPrice(data!.averageOrder)}`}
              icon={<Banknote className="size-4" aria-hidden />}
              tone="accent"
            />
            <StatTile
              label="Клієнтів"
              value={data!.clientCount}
              icon={<Users className="size-4" aria-hidden />}
            />
            <StatTile
              label="Товарів"
              value={data!.productCount}
              hint={`Закінчуються: ${data!.lowStockCount}`}
              icon={<Package className="size-4" aria-hidden />}
              tone={data!.lowStockCount > 0 ? 'warn' : 'default'}
            />
          </div>

          {/* Status breakdown */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(
              ['NEW', 'CONFIRMING', 'PROCESSING', 'COMPLETED', 'CANCELLED'] as OrderStatus[]
            ).map((status) => (
              <Link
                key={status}
                to={`${base}/orders?status=${status}`}
                className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-ink"
              >
                <OrderStatusBadge status={status} />
                <p className="mt-2.5 text-2xl font-extrabold text-ink tabular-nums">
                  {data!.byStatus[status]}
                </p>
              </Link>
            ))}
          </div>

          {/* Revenue trend */}
          <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-base font-extrabold text-ink">
                <TrendingUp className="size-4" aria-hidden />
                Оборот за 14 днів
              </h2>
            </div>

            {/* Each column is full height and pushes its bar to the bottom, so
                the percentage height has something to resolve against. */}
            <div className="mt-5 flex h-36 items-stretch gap-1.5">
              {data!.daily.map((day) => (
                <div
                  key={day.date}
                  className="group relative flex h-full flex-1 flex-col items-center justify-end"
                >
                  <div
                    className={cn(
                      'w-full rounded-t-md transition-colors',
                      day.revenue > 0 ? 'bg-ink group-hover:bg-lime-dark' : 'bg-line',
                    )}
                    style={{
                      height: `${Math.max(2, (day.revenue / maxRevenue) * 100)}%`,
                    }}
                  />
                  <span className="pointer-events-none absolute -top-1 z-10 hidden rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold whitespace-nowrap text-white group-hover:block">
                    {formatPrice(day.revenue)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-ink-faint">
              <span>{formatDateKey(data!.daily[0].date)}</span>
              <span>{formatDateKey(data!.daily[data!.daily.length - 1].date)}</span>
            </div>
          </section>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {/* Low stock */}
            <section className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="flex items-center gap-2 text-base font-extrabold text-ink">
                  <AlertTriangle className="size-4 text-warn" aria-hidden />
                  Товари, які закінчуються
                </h2>
                <Link
                  to={`${base}/stock`}
                  className="text-[13px] font-bold text-ink hover:underline"
                >
                  Склад
                </Link>
              </div>

              {data!.lowStock.length === 0 ? (
                <p className="mt-4 text-sm text-ink-muted">
                  Усі товари у достатній кількості. Порог: {data!.lowStockThreshold} шт.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-line">
                  {data!.lowStock.map((product) => (
                    <li
                      key={product.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <Link
                        to={`/product/${product.slug}`}
                        className="line-clamp-2-safe text-[13px] font-semibold text-ink hover:underline"
                      >
                        {product.name}
                      </Link>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                          product.stock === 0
                            ? 'bg-danger-soft text-danger'
                            : 'bg-warn-soft text-warn',
                        )}
                      >
                        {product.stock} шт.
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Top products */}
            <section className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="text-base font-extrabold text-ink">Найпопулярніші товари</h2>
              {data!.topProducts.length === 0 ? (
                <p className="mt-4 text-sm text-ink-muted">Продажів ще не було.</p>
              ) : (
                <ul className="mt-4 divide-y divide-line">
                  {data!.topProducts.map((product, index) => (
                    <li key={product.id} className="flex items-center gap-3 py-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-ink text-[11px] font-bold text-lime">
                        {index + 1}
                      </span>
                      <Link
                        to={`/product/${product.slug}`}
                        className="line-clamp-2-safe flex-1 text-[13px] font-semibold text-ink hover:underline"
                      >
                        {product.name}
                      </Link>
                      <span className="shrink-0 text-[13px] font-bold text-ink-muted tabular-nums">
                        {product.soldCount} шт.
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Recent orders */}
          <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-extrabold text-ink">Останні замовлення</h2>
              <Link to={`${base}/orders`} className="text-[13px] font-bold text-ink hover:underline">
                Всі замовлення
              </Link>
            </div>

            <ul className="mt-4 divide-y divide-line">
              {data!.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    to={`${base}/orders/${order.id}`}
                    className="-mx-2 flex flex-wrap items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-ground"
                  >
                    <span className="text-sm font-bold text-ink">№{order.number}</span>
                    <OrderStatusBadge status={order.status} />
                    <span className="text-[13px] text-ink-muted">
                      {order.firstName} {order.lastName}
                    </span>
                    <span className="hidden text-[13px] text-ink-faint sm:inline">
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                    <span className="ml-auto text-sm font-bold text-ink tabular-nums">
                      {formatPrice(order.total)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
