import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Heart, MapPin, Package } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { useDocumentMeta } from '@/hooks';
import { accountApi, ApiError } from '@/services';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/feedback';

export function AccountProfilePage() {
  useDocumentMeta('Мої дані');

  const { user, refresh } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    setForm({ name: user.name, email: user.email, phone: user.phone ?? '' });
  }, [user]);

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['account', 'orders'],
    queryFn: () => accountApi.orders(),
  });

  const { data: favorites } = useQuery({
    queryKey: ['account', 'favorites'],
    queryFn: () => accountApi.favorites(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      accountApi.updateProfile({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
      }),
    onSuccess: () => {
      toast.success('Дані збережено ✓');
      refresh();
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setErrors({ ...error.fieldErrors, form: error.details ? '' : error.message });
        if (!error.details) toast.error(error.message);
      }
    },
  });

  const recentOrders = (orders?.items ?? []).slice(0, 3);
  const totalSpent =
    orders?.items
      .filter((order) => order.status !== 'CANCELLED')
      .reduce((sum, order) => sum + order.total, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Summary tiles */}
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Link
          to="/account/orders"
          className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-ink"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">
              Замовлень
            </p>
            <Package className="size-4 text-ink-faint" aria-hidden />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-ink tabular-nums">
            {ordersLoading ? '—' : orders!.items.length}
          </p>
        </Link>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">
            Сума покупок
          </p>
          <p className="mt-2 text-2xl font-extrabold text-ink tabular-nums">
            {ordersLoading ? '—' : formatPrice(totalSpent)}
          </p>
        </div>

        <Link
          to="/account/favorites"
          className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-ink"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">В обраному</p>
            <Heart className="size-4 text-ink-faint" aria-hidden />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-ink tabular-nums">
            {favorites?.items.length ?? 0}
          </p>
        </Link>
      </div>

      {/* Profile form */}
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-ink">Особисті дані</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Ці дані підставляються під час оформлення замовлення.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setErrors({});
            mutation.mutate();
          }}
          className="mt-5 grid gap-4 sm:grid-cols-2"
        >
          <Input
            label="Ім’я та прізвище"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            error={errors.name}
          />
          <Input
            label="Телефон"
            type="tel"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            error={errors.phone}
          />
          <Input
            label="Email"
            type="email"
            required
            wrapperClassName="sm:col-span-2"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            error={errors.email}
          />

          <div className="sm:col-span-2">
            <Button type="submit" loading={mutation.isPending}>
              Зберегти зміни
            </Button>
          </div>
        </form>
      </section>

      {/* Recent orders */}
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-extrabold text-ink">Останні замовлення</h2>
          <Link
            to="/account/orders"
            className="flex items-center gap-1 text-[13px] font-bold text-ink hover:underline"
          >
            Усі
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        {ordersLoading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : recentOrders.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            Замовлень ще немає.{' '}
            <Link to="/catalog" className="font-bold text-ink underline underline-offset-2">
              Перейти до каталогу
            </Link>
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  to={`/account/orders/${order.id}`}
                  className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-ground"
                >
                  <span className="text-sm font-bold text-ink">№{order.number}</span>
                  <OrderStatusBadge status={order.status} />
                  <span className="ml-auto text-sm font-bold text-ink tabular-nums">
                    {formatPrice(order.total)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        to="/account/addresses"
        className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-ink"
      >
        <MapPin className="size-5 text-ink" aria-hidden />
        <span className="flex-1">
          <span className="block text-sm font-bold text-ink">Адреси доставки</span>
          <span className="block text-[13px] text-ink-muted">
            Збережіть адресу, щоб оформлювати замовлення швидше
          </span>
        </span>
        <ArrowRight className="size-4 text-ink-faint" aria-hidden />
      </Link>
    </div>
  );
}
