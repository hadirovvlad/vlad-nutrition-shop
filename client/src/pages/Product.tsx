import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  Heart,
  Package,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Undo2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { PICKUP_ADDRESS, SHOP_NAME } from '@/lib/constants';
import { formatDate, reviewsLabel } from '@/lib/format';
import { useDocumentMeta } from '@/hooks';
import { ApiError, catalogApi, reviewsApi } from '@/services';
import { useAuth } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useFavoritesStore } from '@/store/favorites';
import { toast } from '@/store/toast';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductImage, ProductVisual } from '@/components/product/ProductVisual';
import { PriceTag, StockStatus } from '@/components/product/PriceTag';
import { OptionPills, QuantityStepper } from '@/components/product/QuantityStepper';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { Rating, RatingInput, Tabs } from '@/components/ui/data';
import { Badge, EmptyState, ErrorState, PageLoader } from '@/components/ui/feedback';
import type { Review } from '@/types';

type TabKey = 'description' | 'specs' | 'composition' | 'usage' | 'reviews';

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [quantity, setQuantity] = useState(1);
  const [weight, setWeight] = useState<string | null>(null);
  const [flavor, setFlavor] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [tab, setTab] = useState<TabKey>('description');

  const addToCart = useCartStore((state) => state.add);
  const favorites = useFavoritesStore((state) => state.ids);
  const toggleFavorite = useFavoritesStore((state) => state.toggle);
  const { isAuthenticated } = useAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => catalogApi.product(slug!),
    enabled: Boolean(slug),
    retry: false,
  });

  const product = data?.item;

  // Reset the option pickers whenever a different product loads.
  useEffect(() => {
    if (!product) return;
    setWeight(product.weights[0] ?? product.weight ?? null);
    setFlavor(product.flavors[0] ?? product.flavor ?? null);
    setQuantity(1);
    setActiveImage(0);
    setTab('description');
  }, [product?.id]);

  useDocumentMeta(
    product ? (product.seoTitle ?? `${product.name} — купити в ${SHOP_NAME}`) : 'Товар',
    product?.seoDescription ?? product?.description?.slice(0, 155),
  );

  if (isLoading) return <PageLoader label="Завантажуємо товар…" />;

  if (isError || !product) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="container-page py-16">
        {notFound ? (
          <EmptyState
            title="Товар не знайдено"
            description="Можливо, він більше не продається або посилання застаріло."
            action={<Button onClick={() => navigate('/catalog')}>Перейти до каталогу</Button>}
          />
        ) : (
          <ErrorState onRetry={() => void refetch()} />
        )}
      </div>
    );
  }

  const isFavorite = favorites.includes(product.id);
  const gallery = product.images.length ? product.images : [product.image].filter(Boolean);

  const handleAdd = () => {
    addToCart(product, { quantity, weight, flavor });
    toast.success('Товар додано в кошик ✓', product.name);
  };

  const handleBuyNow = () => {
    addToCart(product, { quantity, weight, flavor });
    navigate('/checkout');
  };

  const tabs: { value: TabKey; label: string; count?: number }[] = [
    { value: 'description', label: 'Опис' },
    ...(product.specs.length ? [{ value: 'specs' as TabKey, label: 'Характеристики' }] : []),
    ...(product.composition ? [{ value: 'composition' as TabKey, label: 'Склад' }] : []),
    ...(product.usage ? [{ value: 'usage' as TabKey, label: 'Спосіб застосування' }] : []),
    { value: 'reviews', label: 'Відгуки', count: product.reviewCount },
  ];

  return (
    <div className="container-page py-6 sm:py-8">
      <nav aria-label="Навігація" className="mb-5 flex flex-wrap items-center gap-1.5 text-[13px]">
        <Link to="/" className="text-ink-muted hover:text-ink">
          Головна
        </Link>
        <ChevronRight className="size-3.5 text-ink-faint" aria-hidden />
        <Link to="/catalog" className="text-ink-muted hover:text-ink">
          Каталог
        </Link>
        {product.category ? (
          <>
            <ChevronRight className="size-3.5 text-ink-faint" aria-hidden />
            <Link to={`/catalog/${product.category.slug}`} className="text-ink-muted hover:text-ink">
              {product.category.name}
            </Link>
          </>
        ) : null}
        <ChevronRight className="size-3.5 text-ink-faint" aria-hidden />
        <span className="font-semibold text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Gallery */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="relative overflow-hidden rounded-3xl border border-line bg-surface">
            <div className="pointer-events-none absolute top-4 left-4 z-10 flex flex-col items-start gap-1.5">
              {product.discount > 0 ? <Badge tone="danger">−{product.discount}%</Badge> : null}
              {product.isNew ? <Badge tone="ink">Новинка</Badge> : null}
              {product.isBestseller ? <Badge tone="lime">Хіт продажів</Badge> : null}
            </div>

            <div className="aspect-square w-full">
              {gallery.length ? (
                <ProductImage
                  src={gallery[activeImage] ?? gallery[0]}
                  name={product.name}
                  slug={product.slug}
                  form={product.form}
                  categorySlug={product.category?.slug ?? null}
                  imgClassName="object-contain p-6"
                />
              ) : (
                <ProductVisual
                  name={product.name}
                  slug={product.slug}
                  form={product.form}
                  categorySlug={product.category?.slug ?? null}
                />
              )}
            </div>
          </div>

          {gallery.length > 1 ? (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {gallery.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`Фото ${index + 1}`}
                  className={cn(
                    'aspect-square overflow-hidden rounded-xl border-2 bg-surface transition-colors',
                    index === activeImage ? 'border-ink' : 'border-line hover:border-ink-faint',
                  )}
                >
                  <ProductImage src={image} name={product.name} slug={product.slug} />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Purchase panel */}
        <div>
          {product.brand ? (
            <Link
              to={`/catalog?brand=${product.brand.slug}`}
              className="text-xs font-bold tracking-wider text-ink-faint uppercase hover:text-ink"
            >
              {product.brand.name}
            </Link>
          ) : null}

          <h1 className="mt-2 text-3xl leading-tight font-extrabold text-ink sm:text-[40px]">
            {product.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            {product.reviewCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setTab('reviews');
                  document.getElementById('product-tabs')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-2 hover:underline"
              >
                <Rating value={product.rating} showValue />
                <span className="text-[13px] text-ink-muted">
                  {reviewsLabel(product.reviewCount)}
                </span>
              </button>
            ) : (
              <span className="text-[13px] text-ink-faint">Ще без відгуків</span>
            )}
            {product.soldCount > 0 ? (
              <span className="text-[13px] text-ink-muted">Продано: {product.soldCount}</span>
            ) : null}
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <PriceTag price={product.price} oldPrice={product.oldPrice} size="lg" />
              {product.discount > 0 ? (
                <span className="rounded-xl bg-danger-soft px-3 py-1.5 text-sm font-bold text-danger">
                  Економія {Math.round((product.oldPrice ?? 0) - product.price)} ₴
                </span>
              ) : null}
            </div>
            <StockStatus stock={product.stock} showCount className="mt-3" />

            <div className="mt-5 space-y-4">
              <OptionPills
                label="Вага:"
                options={product.weights}
                value={weight}
                onChange={setWeight}
              />
              <OptionPills
                label="Смак:"
                options={product.flavors}
                value={flavor}
                onChange={setFlavor}
              />
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <QuantityStepper
                  value={quantity}
                  onChange={setQuantity}
                  max={Math.max(1, product.stock)}
                />
                <Button onClick={handleAdd} disabled={!product.inStock} className="flex-1">
                  <ShoppingCart className="size-[18px]" aria-hidden />
                  Додати в кошик
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="accent"
                  onClick={handleBuyNow}
                  disabled={!product.inStock}
                  className="flex-1"
                >
                  Купити зараз
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={isFavorite ? 'Видалити з обраного' : 'Додати в обране'}
                  aria-pressed={isFavorite}
                  className={cn('size-11', isFavorite && 'border-ink bg-ink text-lime')}
                  onClick={async () => {
                    const next = await toggleFavorite(product.id, isAuthenticated);
                    toast.info(next ? 'Додано в обране' : 'Видалено з обраного', product.name);
                  }}
                >
                  <Heart className={cn('size-[18px]', isFavorite && 'fill-current')} aria-hidden />
                </Button>
              </div>
            </div>
          </div>

          {/* Delivery promises */}
          <ul className="mt-5 space-y-3">
            {[
              { icon: Truck, title: 'Нова Пошта', text: 'Доставка 1–2 дні по всій Україні' },
              { icon: Package, title: 'Самовивіз', text: PICKUP_ADDRESS },
              { icon: ShieldCheck, title: 'Оригінал', text: 'Прямі поставки від дистриб’юторів' },
              { icon: Undo2, title: 'Повернення', text: '14 днів, якщо товар не підійшов' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-ink">
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="text-[13px]">
                    <span className="block font-bold text-ink">{item.title}</span>
                    <span className="block text-ink-muted">{item.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>

          {product.goals.length > 0 ? (
            <div className="mt-6">
              <p className="mb-2 text-[13px] font-semibold text-ink">Підходить для цілей:</p>
              <div className="flex flex-wrap gap-2">
                {product.goals.map((goal) => (
                  <Link
                    key={goal.slug}
                    to={`/catalog?goal=${goal.slug}`}
                    className="rounded-xl bg-lime-soft px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-lime"
                  >
                    {goal.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <section id="product-tabs" className="mt-14 scroll-mt-28">
        <Tabs tabs={tabs} active={tab} onChange={setTab} className="mb-5" />

        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
          {tab === 'description' ? (
            <div className="max-w-3xl">
              <p className="text-[15px] leading-relaxed whitespace-pre-line text-ink-soft">
                {product.description || 'Опис цього товару буде додано найближчим часом.'}
              </p>
            </div>
          ) : null}

          {tab === 'specs' ? (
            <dl className="max-w-2xl divide-y divide-line">
              {product.weight ? (
                <SpecRow label="Вага / об’єм" value={product.weight} />
              ) : null}
              {product.form ? <SpecRow label="Форма випуску" value={product.form} /> : null}
              {product.brand ? <SpecRow label="Бренд" value={product.brand.name} /> : null}
              {product.brand?.country ? (
                <SpecRow label="Країна" value={product.brand.country} />
              ) : null}
              {product.flavors.length ? (
                <SpecRow label="Смаки" value={product.flavors.join(', ')} />
              ) : null}
              {product.specs.map((spec) => (
                <SpecRow key={spec.label} label={spec.label} value={spec.value} />
              ))}
            </dl>
          ) : null}

          {tab === 'composition' ? (
            <p className="max-w-3xl text-[15px] leading-relaxed whitespace-pre-line text-ink-soft">
              {product.composition}
            </p>
          ) : null}

          {tab === 'usage' ? (
            <p className="max-w-3xl text-[15px] leading-relaxed whitespace-pre-line text-ink-soft">
              {product.usage}
            </p>
          ) : null}

          {tab === 'reviews' ? (
            <ReviewsTab
              productId={product.id}
              productSlug={product.slug}
              reviews={data!.reviews}
              rating={product.rating}
              reviewCount={product.reviewCount}
            />
          ) : null}
        </div>
      </section>

      {/* Related */}
      {data!.related.length > 0 ? (
        <section className="mt-14">
          <h2 className="mb-6 text-2xl font-extrabold text-ink sm:text-[28px]">Схожі товари</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {data!.related.map((related) => (
              <ProductCard key={related.id} product={related} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-4 py-3">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

/* --------------------------------- reviews -------------------------------- */

function ReviewsTab({
  productId,
  productSlug,
  reviews,
  rating,
  reviewCount,
}: {
  productId: number;
  productSlug: string;
  reviews: Review[];
  rating: number;
  reviewCount: number;
}) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const [stars, setStars] = useState(5);
  const [text, setText] = useState('');
  const [fieldError, setFieldError] = useState<string>();

  const mine = reviews.find((review) => review.author?.id === user?.id);

  const mutation = useMutation({
    mutationFn: () => reviewsApi.create({ productId, rating: stars, text }),
    onSuccess: () => {
      toast.success(mine ? 'Відгук оновлено ✓' : 'Дякуємо за відгук ✓');
      setText('');
      setFieldError(undefined);
      void queryClient.invalidateQueries({ queryKey: ['product', productSlug] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFieldError(error.fieldErrors.text ?? error.message);
      }
    },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        {reviews.length === 0 ? (
          <EmptyState
            title="Відгуків ще немає"
            description="Будьте першим, хто поділиться досвідом використання цього товару."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <ul className="space-y-5">
            {reviews.map((review) => (
              <li key={review.id} className="border-b border-line pb-5 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-lime">
                    {(review.author?.name ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">
                      {review.author?.name ?? 'Покупець'}
                    </p>
                    <p className="text-xs text-ink-faint">{formatDate(review.createdAt)}</p>
                  </div>
                  <Rating value={review.rating} size="sm" className="ml-auto" />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{review.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside>
        {reviewCount > 0 ? (
          <div className="mb-5 rounded-2xl bg-ground p-5 text-center">
            <p className="text-4xl font-black text-ink tabular-nums">{rating.toFixed(1)}</p>
            <Rating value={rating} size="md" className="mt-2 justify-center" />
            <p className="mt-1.5 text-xs text-ink-muted">{reviewsLabel(reviewCount)}</p>
          </div>
        ) : null}

        {isAuthenticated ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
            className="rounded-2xl border border-line p-5"
          >
            <h3 className="text-sm font-bold text-ink">
              {mine ? 'Змінити свій відгук' : 'Залишити відгук'}
            </h3>
            <div className="mt-3">
              <RatingInput value={stars} onChange={setStars} />
            </div>
            <Textarea
              className="mt-3"
              placeholder="Що сподобалось, а що ні? Як довго користуєтесь?"
              value={text}
              onChange={(event) => setText(event.target.value)}
              error={fieldError}
              required
            />
            <Button
              type="submit"
              fullWidth
              className="mt-3"
              loading={mutation.isPending}
              disabled={text.trim().length < 10}
            >
              Надіслати
            </Button>
          </form>
        ) : (
          <div className="rounded-2xl border border-line p-5 text-center">
            <p className="text-sm text-ink-soft">
              Щоб залишити відгук, увійдіть у свій акаунт.
            </p>
            <Link
              to="/login"
              className="mt-3 inline-flex h-10 items-center rounded-xl bg-ink px-4 text-sm font-bold text-white hover:bg-ink-soft"
            >
              Увійти
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
