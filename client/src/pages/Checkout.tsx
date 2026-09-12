import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Banknote, CreditCard, MapPin, ShoppingBag, Store, Truck } from 'lucide-react';
import { PICKUP_ADDRESS } from '@/lib/constants';
import { formatPrice, productsLabel } from '@/lib/format';
import { useDocumentMeta } from '@/hooks';
import { accountApi, ApiError, ordersApi } from '@/services';
import { useAuth } from '@/store/auth';
import { selectCartCount, selectCartSubtotal, useCartStore } from '@/store/cart';
import { toast } from '@/store/toast';
import { ProductImage } from '@/components/product/ProductVisual';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Input, RadioCard, Select, Textarea } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/feedback';
import type { DeliveryMethod, PaymentMethod } from '@/types';

type Form = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  city: string;
  warehouse: string;
  comment: string;
};

export function CheckoutPage() {
  useDocumentMeta('Оформлення замовлення');

  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const lines = useCartStore((state) => state.lines);
  const count = useCartStore(selectCartCount);
  const subtotal = useCartStore(selectCartSubtotal);
  const clearCart = useCartStore((state) => state.clear);

  const [form, setForm] = useState<Form>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    deliveryMethod: 'NOVA_POSHTA',
    paymentMethod: 'COD',
    city: '',
    warehouse: '',
    comment: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Prefill from the signed-in profile.
  useEffect(() => {
    if (!user) return;
    const [firstName, ...rest] = user.name.split(' ');
    setForm((previous) => ({
      ...previous,
      firstName: previous.firstName || firstName || '',
      lastName: previous.lastName || rest.join(' ') || '',
      email: previous.email || user.email,
      phone: previous.phone || user.phone || '',
    }));
  }, [user]);

  const { data: addressData } = useQuery({
    queryKey: ['account', 'addresses'],
    queryFn: () => accountApi.addresses(),
    enabled: isAuthenticated && user?.role === 'CLIENT',
  });

  const addresses = addressData?.items ?? [];

  // Apply the default saved address once it arrives.
  useEffect(() => {
    const preferred = addresses.find((address) => address.isDefault) ?? addresses[0];
    if (!preferred) return;
    setForm((previous) =>
      previous.city || previous.warehouse
        ? previous
        : { ...previous, city: preferred.city, warehouse: preferred.warehouse },
    );
  }, [addresses]);

  const mutation = useMutation({
    mutationFn: () =>
      ordersApi.create({
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          weight: line.weight ?? undefined,
          flavor: line.flavor ?? undefined,
        })),
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        email: form.email,
        deliveryMethod: form.deliveryMethod,
        paymentMethod: form.paymentMethod,
        city: form.deliveryMethod === 'NOVA_POSHTA' ? form.city : undefined,
        warehouse: form.deliveryMethod === 'NOVA_POSHTA' ? form.warehouse : undefined,
        comment: form.comment || undefined,
      }),
    onSuccess: (result) => {
      clearCart();
      toast.success('Замовлення успішно створено ✓', `№${result.item.number}`);
      navigate(`/order/${result.item.number}`, { replace: true });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        toast.error(error.message);
      } else {
        toast.error('Щось пішло не так. Спробуйте ще раз.');
      }
    },
  });

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  if (lines.length === 0 && !mutation.isSuccess) {
    return (
      <div className="container-page py-14">
        <EmptyState
          icon={<ShoppingBag className="size-6" aria-hidden />}
          title="Немає чого оформлювати"
          description="Спочатку додайте товари в кошик."
          action={<ButtonLink to="/catalog">Перейти до каталогу</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="mb-6 text-3xl font-extrabold text-ink sm:text-[40px]">
        Оформлення замовлення
      </h1>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setErrors({});
          mutation.mutate();
        }}
        className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8"
      >
        <div className="space-y-5">
          {!isAuthenticated ? (
            <p className="rounded-2xl border border-line bg-surface p-4 text-[13px] text-ink-soft">
              Оформлюєте як гість.{' '}
              <Link to="/login" className="font-bold text-ink underline underline-offset-2">
                Увійдіть
              </Link>
              , щоб бачити історію замовлень у кабінеті.
            </p>
          ) : null}

          {/* Customer */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-4 text-lg font-extrabold text-ink">Дані клієнта</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Ім’я"
                required
                value={form.firstName}
                onChange={(event) => set('firstName', event.target.value)}
                error={errors.firstName}
                autoComplete="given-name"
              />
              <Input
                label="Прізвище"
                required
                value={form.lastName}
                onChange={(event) => set('lastName', event.target.value)}
                error={errors.lastName}
                autoComplete="family-name"
              />
              <Input
                label="Телефон"
                required
                type="tel"
                placeholder="+380 XX XXX XX XX"
                value={form.phone}
                onChange={(event) => set('phone', event.target.value)}
                error={errors.phone}
                autoComplete="tel"
              />
              <Input
                label="Email"
                required
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(event) => set('email', event.target.value)}
                error={errors.email}
                autoComplete="email"
              />
            </div>
          </section>

          {/* Delivery */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-4 text-lg font-extrabold text-ink">Доставка</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <RadioCard
                checked={form.deliveryMethod === 'NOVA_POSHTA'}
                onSelect={() => set('deliveryMethod', 'NOVA_POSHTA')}
                title="Нова Пошта"
                description="Відділення або поштомат, 1–2 дні"
                icon={<Truck className="size-4" aria-hidden />}
              />
              <RadioCard
                checked={form.deliveryMethod === 'PICKUP'}
                onSelect={() => set('deliveryMethod', 'PICKUP')}
                title="Самовивіз"
                description={PICKUP_ADDRESS}
                icon={<Store className="size-4" aria-hidden />}
              />
            </div>

            {form.deliveryMethod === 'NOVA_POSHTA' ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {addresses.length > 0 ? (
                  <Select
                    label="Збережена адреса"
                    wrapperClassName="sm:col-span-2"
                    value=""
                    onChange={(event) => {
                      const selected = addresses.find(
                        (address) => String(address.id) === event.target.value,
                      );
                      if (!selected) return;
                      set('city', selected.city);
                      set('warehouse', selected.warehouse);
                    }}
                  >
                    <option value="">Вибрати з моїх адрес…</option>
                    {addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.label}: {address.city}, {address.warehouse}
                      </option>
                    ))}
                  </Select>
                ) : null}

                <Input
                  label="Місто"
                  required
                  placeholder="Київ"
                  value={form.city}
                  onChange={(event) => set('city', event.target.value)}
                  error={errors.city}
                  autoComplete="address-level2"
                />
                <Input
                  label="Відділення / поштомат"
                  required
                  placeholder="Відділення №12"
                  value={form.warehouse}
                  onChange={(event) => set('warehouse', event.target.value)}
                  error={errors.warehouse}
                />
              </div>
            ) : (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-ground p-3.5 text-[13px] text-ink-soft">
                <MapPin className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
                Забрати можна за адресою: {PICKUP_ADDRESS}. Ми зателефонуємо, коли замовлення буде
                готове.
              </p>
            )}
          </section>

          {/* Payment */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-4 text-lg font-extrabold text-ink">Оплата</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <RadioCard
                checked={form.paymentMethod === 'COD'}
                onSelect={() => set('paymentMethod', 'COD')}
                title="Післяплата"
                description="Оплата під час отримання"
                icon={<Banknote className="size-4" aria-hidden />}
              />
              <RadioCard
                checked={form.paymentMethod === 'ONLINE'}
                onSelect={() => set('paymentMethod', 'ONLINE')}
                title="Онлайн-оплата"
                description="Надішлемо посилання для оплати"
                icon={<CreditCard className="size-4" aria-hidden />}
              />
            </div>

            <Textarea
              label="Коментар до замовлення"
              className="mt-4"
              placeholder="Побажання щодо смаку, часу доставки тощо"
              value={form.comment}
              onChange={(event) => set('comment', event.target.value)}
              error={errors.comment}
            />
          </section>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-lg font-extrabold text-ink">Ваше замовлення</h2>

            <ul className="mt-4 space-y-3">
              {lines.map((line) => (
                <li
                  key={`${line.productId}-${line.weight}-${line.flavor}`}
                  className="flex items-center gap-3"
                >
                  <span className="size-12 shrink-0 overflow-hidden rounded-lg border border-line bg-ground">
                    <ProductImage
                      src={line.image}
                      name={line.name}
                      slug={line.slug}
                      categorySlug={line.categorySlug}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2-safe text-[13px] font-semibold text-ink">
                      {line.name}
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      {[line.weight, line.flavor].filter(Boolean).join(' · ')}
                      {line.weight || line.flavor ? ' · ' : ''}
                      {line.quantity} шт.
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] font-bold text-ink tabular-nums">
                    {formatPrice(Math.round(line.price * line.quantity * 100) / 100)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Товари ({productsLabel(count)})</dt>
                <dd className="font-semibold text-ink tabular-nums">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Доставка</dt>
                <dd className="font-semibold text-ink">
                  {form.deliveryMethod === 'PICKUP' ? 'безкоштовно' : 'за тарифами'}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-4">
              <span className="text-base font-extrabold text-ink">Разом</span>
              <span className="text-2xl font-black text-ink tabular-nums">
                {formatPrice(subtotal)}
              </span>
            </div>

            <Button
              type="submit"
              variant="accent"
              size="lg"
              fullWidth
              className="mt-5"
              loading={mutation.isPending}
            >
              Підтвердити замовлення
            </Button>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-faint">
              Натискаючи кнопку, ви погоджуєтесь з умовами продажу та обробкою персональних даних.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
