import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Compass, FlaskConical, HeartHandshake, PackageSearch, Truck } from 'lucide-react';
import { SHOP_NAME } from '@/lib/constants';
import { productsLabel } from '@/lib/format';
import { useDocumentMeta } from '@/hooks';
import { catalogApi } from '@/services';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/feedback';

export function BrandsPage() {
  useDocumentMeta(
    'Бренди',
    `Офіційні бренди спортивного харчування в магазині ${SHOP_NAME}: Optimum Nutrition, BioTech USA, Scitec Nutrition та інші.`,
  );

  const { data, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => catalogApi.brands(),
    staleTime: 5 * 60_000,
  });

  const brands = data?.items ?? [];

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeader
        eyebrow="Асортимент"
        title="Бренди"
        description="Працюємо лише з офіційними постачальниками. Кожна партія має захисні наліпки виробника."
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <EmptyState title="Брендів ще немає" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              to={`/catalog?brand=${brand.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-ink hover:shadow-lift"
            >
              <span className="text-base leading-tight font-extrabold text-ink">{brand.name}</span>
              <span className="mt-4 flex items-baseline justify-between gap-2">
                <span className="text-[13px] text-ink-muted">
                  {productsLabel(brand.productCount ?? 0)}
                </span>
                {brand.country ? (
                  <span className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">
                    {brand.country}
                  </span>
                ) : null}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------- about -------------------------------- */

const PRINCIPLES = [
  {
    icon: FlaskConical,
    title: 'Склад важливіший за упаковку',
    text: 'Ми не беремо в асортимент продукт, у якого активна доза сховалась за «пропрієтарною формулою». Якщо дозування не вказане — його немає.',
  },
  {
    icon: PackageSearch,
    title: 'Вузький асортимент замість нескінченного',
    text: 'Краще 50 позицій, за які не соромно, ніж 5000 і надія, що ви розберетесь самі.',
  },
  {
    icon: Truck,
    title: 'Швидко і без сюрпризів',
    text: 'Замовлення до 15:00 відправляємо того ж дня. Наявність на сайті збігається з наявністю на складі.',
  },
  {
    icon: HeartHandshake,
    title: 'Радимо те, що потрібно',
    text: 'Менеджер може сказати «вам це не потрібно». Це нормально — так довіра тримається довше за одну покупку.',
  },
];

export function AboutPage() {
  useDocumentMeta(
    'Про нас',
    `${SHOP_NAME} — магазин спортивного харчування з вузьким, але перевіреним асортиментом. Наші принципи та контакти.`,
  );

  return (
    <div>
      <section className="relative overflow-hidden bg-ink py-16 text-white sm:py-24">
        <div
          className="pointer-events-none absolute -top-1/2 right-0 size-[40rem] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--color-lime) 0%, transparent 70%)' }}
          aria-hidden
        />
        <div className="container-page relative max-w-3xl">
          <p className="text-[11px] font-bold tracking-[0.12em] text-lime uppercase">Про нас</p>
          <h1 className="mt-4 text-4xl leading-[1.05] font-black tracking-tight sm:text-6xl">
            Магазин, яким ми самі хотіли б користуватися
          </h1>
          <p className="mt-6 text-base leading-relaxed text-white/65 sm:text-lg">
            {SHOP_NAME} почався з простої претензії до ринку: знайти нормальний протеїн без вивчення
            десяти форумів майже неможливо. Ми вирішили зібрати короткий список того, що справді
            працює, і продавати саме його.
          </p>
        </div>
      </section>

      <div className="container-page py-12 sm:py-16">
        <div className="grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map((principle) => {
            const Icon = principle.icon;
            return (
              <article
                key={principle.title}
                className="rounded-2xl border border-line bg-surface p-6"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-lime-soft text-ink">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h2 className="mt-4 text-lg font-extrabold text-ink">{principle.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{principle.text}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-3xl bg-lime p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-ink">Не знаєте, з чого почати?</h2>
            <p className="mt-1.5 text-sm text-ink-soft">
              Виберіть ціль — покажемо короткий список того, що на неї працює.
            </p>
          </div>
          <ButtonLink to="/catalog" variant="primary" size="lg">
            <Compass className="size-[18px]" aria-hidden />
            Підібрати за ціллю
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- not found ------------------------------ */

export function NotFoundPage() {
  useDocumentMeta('Сторінку не знайдено');

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-[80px] leading-none font-black text-ink sm:text-[120px]">404</p>
      <h1 className="mt-4 text-2xl font-extrabold text-ink">Такої сторінки немає</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        Можливо, посилання застаріло або ви перейшли за неправильною адресою.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <ButtonLink to="/">На головну</ButtonLink>
        <ButtonLink to="/catalog" variant="outline">
          Перейти до каталогу
        </ButtonLink>
      </div>
    </div>
  );
}
