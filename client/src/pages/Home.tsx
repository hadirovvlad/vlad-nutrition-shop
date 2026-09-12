import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Flame, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DISCOUNT_STEPS, SHOP_NAME } from '@/lib/constants';
import { productsLabel } from '@/lib/format';
import { useDocumentMeta } from '@/hooks';
import { catalogApi } from '@/services';
import { ProductCard } from '@/components/product/ProductCard';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { ButtonLink } from '@/components/ui/Button';
import { ErrorState, ProductGridSkeleton, Skeleton } from '@/components/ui/feedback';
import type { Category, Goal, Product } from '@/types';

/** Categories promoted as cards in the "Популярні категорії" block. */
const FEATURED_CATEGORY_SLUGS = [
  'protein',
  'pre-workout',
  'creatine',
  'fat-burners',
  'bars',
  'vitamins',
];

/** Short labels so a long official name does not overflow a narrow card. */
const CARD_LABEL: Record<string, string> = {
  'pre-workout': 'Передтренувальні',
};

const GOAL_ART: Record<string, { gradient: string; emoji: string }> = {
  mass: { gradient: 'from-[#1f1f1f] to-[#3a3a3a]', emoji: '🏋️' },
  cutting: { gradient: 'from-[#14342b] to-[#1f5b48]', emoji: '🔥' },
  recovery: { gradient: 'from-[#1b2a4a] to-[#2f4a7a]', emoji: '🌙' },
  strength: { gradient: 'from-[#3a2410] to-[#6b431c]', emoji: '⚡' },
  health: { gradient: 'from-[#123240] to-[#1d5468]', emoji: '🩺' },
  energy: { gradient: 'from-[#3d3410] to-[#6b5c17]', emoji: '🔋' },
};

export function HomePage() {
  useDocumentMeta(
    `${SHOP_NAME} — спортивне харчування для тих, хто не зупиняється`,
    'Протеїн, креатин, гейнери, амінокислоти та вітаміни оригінальних брендів. Доставка Новою Поштою по Україні.',
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['home'],
    queryFn: () => catalogApi.home(),
    staleTime: 60_000,
  });

  return (
    <>
      <Hero productCount={data?.productCount} />

      <div className="container-page py-12 sm:py-16">
        {isError ? (
          <ErrorState
            description="Не вдалося завантажити головну сторінку."
            onRetry={() => void refetch()}
          />
        ) : (
          <div className="space-y-16 sm:space-y-20">
            <PopularCategories categories={data?.categories} isLoading={isLoading} />
            <BestsellersSection products={data?.bestsellers} isLoading={isLoading} />
            <DealsSection products={data?.deals} isLoading={isLoading} />
            <GoalsSection goals={data?.goals} />
            <NewArrivalsSection products={data?.newArrivals} isLoading={isLoading} />
            <BrandsStrip brands={data?.brands} />
          </div>
        )}
      </div>
    </>
  );
}

/* ----------------------------------- hero --------------------------------- */

function Hero({ productCount }: { productCount?: number }) {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      {/* Abstract lime glow instead of a stock photo. */}
      <div
        className="pointer-events-none absolute -top-1/3 -right-1/4 size-[70vw] rounded-full opacity-25 blur-3xl"
        style={{
          background: 'radial-gradient(circle, var(--color-lime) 0%, transparent 70%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-lime) 1px, transparent 1px), linear-gradient(90deg, var(--color-lime) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
        aria-hidden
      />

      <div className="container-page relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase backdrop-blur-sm">
            <Sparkles className="size-3.5 text-lime" aria-hidden />
            {productCount ? `${productsLabel(productCount)} в наявності` : 'Оригінальні бренди'}
          </span>

          <h1 className="mt-5 text-[40px] leading-[0.95] font-black tracking-tight sm:text-6xl lg:text-[76px]">
            БУДУЙ
            <br />
            <span className="text-lime">СИЛЬНІШЕ</span> ТІЛО
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-white/65 sm:text-lg">
            Спортивне харчування для тих, хто не зупиняється. Без маркетингових обіцянок — лише
            робочі склади й прозорі дозування.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink to="/catalog" variant="accent" size="lg">
              Перейти до каталогу
              <ArrowRight className="size-[18px]" aria-hidden />
            </ButtonLink>
            <ButtonLink
              to="/sale"
              size="lg"
              className="border border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              Гарячі пропозиції
            </ButtonLink>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {[
              { label: 'Протеїн', slug: 'protein' },
              { label: 'Креатин', slug: 'creatine' },
              { label: 'Передтренувальні', slug: 'pre-workout' },
            ].map((item) => (
              <Link
                key={item.slug}
                to={`/catalog/${item.slug}`}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-[13px] font-semibold text-white/80 transition-colors hover:border-lime hover:bg-lime hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Numbers panel — a cleaner promise than a stock gym photo. */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[
            { value: '12', label: 'офіційних брендів' },
            { value: '1–2', label: 'дні до доставки' },
            { value: '100%', label: 'оригінальна продукція' },
            { value: '14', label: 'днів на повернення' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm"
            >
              <p className="text-3xl font-black text-lime sm:text-4xl">{stat.value}</p>
              <p className="mt-1.5 text-xs leading-snug text-white/55">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- categories ------------------------------- */

function PopularCategories({
  categories,
  isLoading,
}: {
  categories?: Category[];
  isLoading: boolean;
}) {
  const featured = FEATURED_CATEGORY_SLUGS.map((slug) =>
    categories?.find((category) => category.slug === slug),
  ).filter((category): category is Category => Boolean(category));

  return (
    <section>
      <SectionHeader
        eyebrow="Категорії"
        title="Популярні категорії"
        description="Почніть з того, що працює: базові категорії, які закривають 90 % завдань."
        linkTo="/catalog"
        linkLabel="Всі категорії"
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="min-h-[150px] rounded-2xl sm:min-h-[170px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
          {featured.map((category) => (
            <Link
              key={category.id}
              to={`/catalog/${category.slug}`}
              className="group relative flex min-h-[150px] flex-col justify-between gap-6 overflow-hidden rounded-2xl border border-line bg-surface p-4 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-ink hover:shadow-lift sm:min-h-[170px]"
            >
              <span
                className="absolute -right-6 -bottom-6 text-[84px] leading-none opacity-[0.08] transition-transform duration-500 group-hover:scale-110 group-hover:opacity-[0.14]"
                aria-hidden
              >
                {category.icon}
              </span>
              <span className="text-3xl" aria-hidden>
                {category.icon}
              </span>
              <span className="relative">
                <span className="block text-[13px] leading-tight font-bold text-ink sm:text-sm">
                  {CARD_LABEL[category.slug] ?? category.name}
                </span>
                <span className="mt-1 block text-[11px] text-ink-faint">
                  {productsLabel(category.productCount)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/* -------------------------------- bestsellers ----------------------------- */

function BestsellersSection({
  products,
  isLoading,
}: {
  products?: Product[];
  isLoading: boolean;
}) {
  return (
    <section>
      <SectionHeader
        eyebrow={
          <>
            <TrendingUp className="size-3.5" aria-hidden />
            Найчастіше обирають
          </>
        }
        title="Хіти продажів"
        linkTo="/catalog?sort=popular"
      />
      {isLoading ? (
        <ProductGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {(products ?? []).slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ----------------------------------- deals -------------------------------- */

function DealsSection({ products, isLoading }: { products?: Product[]; isLoading: boolean }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-ink px-4 py-10 sm:px-8 sm:py-12">
      <div
        className="pointer-events-none absolute -top-1/2 left-1/2 size-[40rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #ff6b35 0%, transparent 70%)' }}
        aria-hidden
      />

      <div className="relative mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] text-lime uppercase">
            <Flame className="size-3.5" aria-hidden />
            Знижки тижня
          </p>
          <h2 className="text-2xl font-extrabold text-white sm:text-[32px]">Гарячі пропозиції</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {DISCOUNT_STEPS.map((step) => (
            <Link
              key={step}
              to={`/sale?min=${step}`}
              className="rounded-xl border border-white/15 px-3 py-2 text-[13px] font-bold text-white transition-colors hover:border-lime hover:bg-lime hover:text-ink"
            >
              −{step}%
            </Link>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[3/4] rounded-2xl bg-white/10" />
          ))}
        </div>
      ) : (
        <div className="relative grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {(products ?? []).slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <div className="relative mt-7 flex justify-center">
        <ButtonLink to="/sale" variant="accent">
          Всі товари зі знижкою
          <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
      </div>
    </section>
  );
}

/* ----------------------------------- goals -------------------------------- */

function GoalsSection({ goals }: { goals?: Goal[] }) {
  if (!goals?.length) return null;

  return (
    <section>
      <SectionHeader
        eyebrow="За цілями"
        title="Що саме ви хочете змінити?"
        description="Виберіть ціль — покажемо тільки те, що на неї працює."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {goals.map((goal) => {
          const art = GOAL_ART[goal.slug] ?? { gradient: 'from-[#1f1f1f] to-[#3a3a3a]', emoji: '🎯' };
          return (
            <Link
              key={goal.slug}
              to={`/catalog?goal=${goal.slug}`}
              className={cn(
                'group relative flex min-h-[120px] flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white transition-transform duration-300 hover:-translate-y-1',
                art.gradient,
              )}
            >
              <span
                className="absolute top-4 right-4 text-4xl opacity-60 transition-transform duration-500 group-hover:scale-110"
                aria-hidden
              >
                {art.emoji}
              </span>
              <span className="text-base leading-tight font-extrabold sm:text-lg">{goal.name}</span>
              <span className="mt-1 flex items-center gap-1 text-xs text-white/60">
                Підібрати товари
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------- new arrivals ---------------------------- */

function NewArrivalsSection({
  products,
  isLoading,
}: {
  products?: Product[];
  isLoading: boolean;
}) {
  if (!isLoading && !products?.length) return null;

  return (
    <section>
      <SectionHeader eyebrow="Щойно привезли" title="Новинки" linkTo="/new" />
      {isLoading ? (
        <ProductGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {(products ?? []).slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------- brands -------------------------------- */

function BrandsStrip({ brands }: { brands?: { id: number; name: string; slug: string }[] }) {
  if (!brands?.length) return null;

  return (
    <section>
      <SectionHeader eyebrow="Бренди" title="З ким ми працюємо" linkTo="/brands" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {brands.slice(0, 12).map((brand) => (
          <Link
            key={brand.id}
            to={`/catalog?brand=${brand.slug}`}
            className="flex min-h-[72px] items-center justify-center rounded-2xl border border-line bg-surface px-3 text-center text-[13px] font-bold text-ink-soft transition-all duration-200 hover:border-ink hover:text-ink"
          >
            {brand.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
