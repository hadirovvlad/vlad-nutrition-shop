import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { FREE_DELIVERY_FROM } from '@/lib/constants';
import { formatPrice, productsLabel } from '@/lib/format';
import { useDocumentMeta } from '@/hooks';
import {
  cartKey,
  selectCartCount,
  selectCartSavings,
  selectCartSubtotal,
  useCartStore,
} from '@/store/cart';
import { toast } from '@/store/toast';
import { ProductImage } from '@/components/product/ProductVisual';
import { QuantityStepper } from '@/components/product/QuantityStepper';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/feedback';

export function CartPage() {
  useDocumentMeta('Кошик');

  const lines = useCartStore((state) => state.lines);
  const count = useCartStore(selectCartCount);
  const subtotal = useCartStore(selectCartSubtotal);
  const savings = useCartStore(selectCartSavings);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);
  const clear = useCartStore((state) => state.clear);

  if (lines.length === 0) {
    return (
      <div className="container-page py-14">
        <h1 className="mb-8 text-3xl font-extrabold text-ink sm:text-[40px]">Кошик</h1>
        <EmptyState
          icon={<ShoppingBag className="size-6" aria-hidden />}
          title="Кошик порожній"
          description="Додайте товари з каталогу — вони з’являться тут."
          action={
            <ButtonLink to="/catalog">
              Перейти до каталогу
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          }
        />
      </div>
    );
  }

  // Delivery is paid by the carrier's tariff; above the threshold we cover it.
  const freeDeliveryGap = Math.max(0, FREE_DELIVERY_FROM - subtotal);

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-ink sm:text-[40px]">Кошик</h1>
        <button
          type="button"
          onClick={() => {
            clear();
            toast.info('Кошик очищено');
          }}
          className="text-[13px] font-semibold text-ink-muted hover:text-danger"
        >
          Очистити кошик
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
        {/* Lines */}
        <ul className="space-y-3">
          {lines.map((line) => {
            const key = cartKey(line.productId, line.weight, line.flavor);
            const lineTotal = Math.round(line.price * line.quantity * 100) / 100;

            return (
              <li
                key={key}
                className="flex gap-3 rounded-2xl border border-line bg-surface p-3 sm:gap-4 sm:p-4"
              >
                <Link
                  to={`/product/${line.slug}`}
                  className="size-20 shrink-0 overflow-hidden rounded-xl border border-line bg-ground sm:size-24"
                >
                  <ProductImage
                    src={line.image}
                    name={line.name}
                    slug={line.slug}
                    categorySlug={line.categorySlug}
                  />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {line.brand ? (
                        <p className="text-[10px] font-bold tracking-wider text-ink-faint uppercase">
                          {line.brand}
                        </p>
                      ) : null}
                      <Link
                        to={`/product/${line.slug}`}
                        className="line-clamp-2-safe text-sm font-bold text-ink hover:underline sm:text-[15px]"
                      >
                        {line.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {line.weight ? (
                          <span className="rounded-md bg-ground px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft">
                            {line.weight}
                          </span>
                        ) : null}
                        {line.flavor ? (
                          <span className="rounded-md bg-ground px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft">
                            {line.flavor}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        remove(key);
                        toast.info('Товар видалено з кошика', line.name);
                      }}
                      aria-label="Видалити товар"
                      className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="size-[17px]" aria-hidden />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                    <QuantityStepper
                      value={line.quantity}
                      onChange={(next) => setQuantity(key, next)}
                      max={Math.max(1, line.stock)}
                      size="sm"
                    />
                    <div className="text-right">
                      <p className="text-base font-extrabold text-ink tabular-nums">
                        {formatPrice(lineTotal)}
                      </p>
                      {line.quantity > 1 ? (
                        <p className="text-[11px] text-ink-faint tabular-nums">
                          {formatPrice(line.price)} × {line.quantity}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {line.quantity >= line.stock ? (
                    <p className="mt-2 text-[11px] font-semibold text-warn">
                      Максимальна доступна кількість: {line.stock} шт.
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Summary */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-lg font-extrabold text-ink">Ваше замовлення</h2>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Товари ({productsLabel(count)})</dt>
                <dd className="font-semibold text-ink tabular-nums">{formatPrice(subtotal)}</dd>
              </div>
              {savings > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Ваша економія</dt>
                  <dd className="font-semibold text-danger tabular-nums">
                    −{formatPrice(savings)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Доставка</dt>
                <dd className="font-semibold text-ink">
                  {freeDeliveryGap > 0 ? 'за тарифами' : 'за наш рахунок'}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-4">
              <span className="text-base font-extrabold text-ink">Разом</span>
              <span className="text-2xl font-black text-ink tabular-nums">
                {formatPrice(subtotal)}
              </span>
            </div>

            <ButtonLink to="/checkout" variant="accent" size="lg" fullWidth className="mt-5">
              Оформити замовлення
              <ArrowRight className="size-[18px]" aria-hidden />
            </ButtonLink>

            <Button
              variant="ghost"
              fullWidth
              className="mt-2"
              onClick={() => window.history.back()}
            >
              Продовжити покупки
            </Button>

            {freeDeliveryGap > 0 ? (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-lime-soft p-3 text-[13px] font-medium text-ink">
                <Truck className="mt-0.5 size-4 shrink-0" aria-hidden />
                Додайте товарів на {formatPrice(freeDeliveryGap)} для безкоштовної доставки.
              </p>
            ) : (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-lime-soft p-3 text-[13px] font-semibold text-ink">
                <Truck className="mt-0.5 size-4 shrink-0" aria-hidden />
                Доставку цього замовлення оплачуємо ми.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
