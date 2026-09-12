import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Package, Phone } from 'lucide-react';
import { DELIVERY_LABEL, PAYMENT_LABEL, SUPPORT_PHONE } from '@/lib/constants';
import { formatDateTime, formatPrice, telHref } from '@/lib/format';
import { useDocumentMeta } from '@/hooks';
import { ordersApi } from '@/services';
import { useAuth } from '@/store/auth';
import { ButtonLink } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/feedback';

export function OrderSuccessPage() {
  const { number } = useParams<{ number: string }>();
  const { isAuthenticated } = useAuth();

  useDocumentMeta(`Замовлення №${number} створено`);

  const { data, isLoading } = useQuery({
    queryKey: ['order-confirmation', number],
    queryFn: () => ordersApi.confirmation(Number(number)),
    enabled: Boolean(number),
    retry: false,
  });

  if (isLoading) return <PageLoader />;

  const order = data?.item;

  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-14">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex size-16 animate-pop items-center justify-center rounded-2xl bg-lime">
          <CheckCircle2 className="size-8 text-ink" aria-hidden />
        </div>

        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
          Замовлення №{number} успішно створено
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Наш менеджер зателефонує вам найближчим часом, щоб підтвердити деталі. Дякуємо за довіру!
        </p>

        {order ? (
          <dl className="mt-7 divide-y divide-line rounded-2xl border border-line bg-surface px-5 text-left text-sm">
            <Row label="Номер замовлення" value={`№${order.number}`} />
            <Row label="Дата" value={formatDateTime(order.createdAt)} />
            <Row label="Товарів" value={`${order.itemCount} шт.`} />
            <Row label="Доставка" value={DELIVERY_LABEL[order.deliveryMethod]} />
            <Row label="Оплата" value={PAYMENT_LABEL[order.paymentMethod]} />
            <Row label="До сплати" value={formatPrice(order.total)} strong />
          </dl>
        ) : null}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {isAuthenticated ? (
            <ButtonLink to="/account/orders">
              <Package className="size-4" aria-hidden />
              Мої замовлення
            </ButtonLink>
          ) : null}
          <ButtonLink to="/catalog" variant="outline">
            Продовжити покупки
          </ButtonLink>
        </div>

        <p className="mt-6 text-[13px] text-ink-muted">
          Виникли питання?{' '}
          <a
            href={telHref(SUPPORT_PHONE)}
            className="inline-flex items-center gap-1 font-bold text-ink hover:underline"
          >
            <Phone className="size-3.5" aria-hidden />
            {SUPPORT_PHONE}
          </a>
        </p>

        {!isAuthenticated ? (
          <p className="mt-4 text-[13px] text-ink-muted">
            <Link to="/register" className="font-bold text-ink underline underline-offset-2">
              Створіть акаунт
            </Link>
            , щоб відслідковувати статус замовлення онлайн.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={strong ? 'text-base font-extrabold text-ink' : 'font-semibold text-ink'}>
        {value}
      </dd>
    </div>
  );
}
