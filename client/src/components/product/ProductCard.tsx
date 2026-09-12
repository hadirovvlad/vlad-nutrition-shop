import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, Eye, Heart, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFlash } from '@/hooks';
import { useAuth } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useFavoritesStore } from '@/store/favorites';
import { toast } from '@/store/toast';
import { Badge } from '@/components/ui/feedback';
import { Rating } from '@/components/ui/data';
import { ProductImage } from './ProductVisual';
import { PriceTag, StockStatus } from './PriceTag';
import { QuickView } from './QuickView';
import type { Product } from '@/types';

export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [added, flashAdded] = useFlash();

  const addToCart = useCartStore((state) => state.add);
  const favorites = useFavoritesStore((state) => state.ids);
  const toggleFavorite = useFavoritesStore((state) => state.toggle);
  const { isAuthenticated } = useAuth();

  const isFavorite = favorites.includes(product.id);

  const handleAdd = () => {
    if (!product.inStock) return;
    addToCart(product);
    flashAdded();
    toast.success('Товар додано в кошик ✓', product.name);
  };

  const handleFavorite = async () => {
    const next = await toggleFavorite(product.id, isAuthenticated);
    toast.info(next ? 'Додано в обране' : 'Видалено з обраного', product.name);
  };

  return (
    <>
      <article
        className={cn(
          'group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface',
          'transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out-soft)]',
          'hover:-translate-y-1 hover:border-line-strong hover:shadow-lift',
          className,
        )}
      >
        {/* Badges */}
        <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
          {product.discount > 0 ? <Badge tone="danger">−{product.discount}%</Badge> : null}
          {product.isNew ? <Badge tone="ink">Новинка</Badge> : null}
          {product.isBestseller ? <Badge tone="lime">Хіт продажів</Badge> : null}
        </div>

        {/* Favourite */}
        <button
          type="button"
          onClick={handleFavorite}
          aria-label={isFavorite ? 'Видалити з обраного' : 'Додати в обране'}
          aria-pressed={isFavorite}
          className={cn(
            'absolute top-2.5 right-2.5 z-10 flex size-9 items-center justify-center rounded-xl transition-all duration-200',
            isFavorite
              ? 'bg-ink text-lime'
              : 'bg-surface/80 text-ink-muted backdrop-blur-sm hover:bg-ink hover:text-white',
          )}
        >
          <Heart className={cn('size-[17px]', isFavorite && 'fill-current animate-pop')} aria-hidden />
        </button>

        <Link to={`/product/${product.slug}`} className="relative block overflow-hidden bg-ground">
          <div className="aspect-square w-full transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]">
            <ProductImage
              src={product.image}
              name={product.name}
              slug={product.slug}
              form={product.form}
              categorySlug={product.category?.slug ?? null}
            />
          </div>

          {!product.inStock ? (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/70 backdrop-blur-[1px]">
              <span className="rounded-full bg-ink px-3 py-1.5 text-[11px] font-bold tracking-wide text-white uppercase">
                Немає в наявності
              </span>
            </div>
          ) : null}

          {/* Quick view — appears on hover, hidden on touch where hover is meaningless */}
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              setQuickViewOpen(true);
            }}
            className="absolute inset-x-3 bottom-3 hidden h-9 items-center justify-center gap-1.5 rounded-xl bg-ink/90 text-[13px] font-semibold text-white opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 md:flex"
          >
            <Eye className="size-4" aria-hidden />
            Швидкий перегляд
          </button>
        </Link>

        <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
          {product.brand ? (
            <Link
              to={`/catalog?brand=${product.brand.slug}`}
              className="text-[11px] font-bold tracking-wider text-ink-faint uppercase transition-colors hover:text-ink"
            >
              {product.brand.name}
            </Link>
          ) : null}

          <h3 className="text-sm leading-snug font-bold text-ink">
            <Link to={`/product/${product.slug}`} className="line-clamp-2-safe hover:underline">
              {product.name}
            </Link>
          </h3>

          {product.reviewCount > 0 ? (
            <Rating value={product.rating} size="sm" showValue count={product.reviewCount} />
          ) : (
            <span className="text-xs text-ink-faint">Ще без відгуків</span>
          )}

          {/* Weight / flavour */}
          <div className="flex flex-wrap gap-1">
            {product.weight ? (
              <span className="rounded-md bg-ground px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft">
                {product.weight}
              </span>
            ) : null}
            {product.flavor ? (
              <span className="rounded-md bg-ground px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft">
                {product.flavor}
              </span>
            ) : null}
          </div>

          <StockStatus stock={product.stock} className="mt-0.5" />

          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <PriceTag price={product.price} oldPrice={product.oldPrice} />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!product.inStock}
              aria-label="Додати в кошик"
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 active:scale-95',
                added
                  ? 'bg-lime text-ink'
                  : 'bg-ink text-white hover:bg-ink-soft disabled:bg-line-strong disabled:text-ink-faint',
              )}
            >
              {added ? (
                <Check className="size-[18px] animate-pop" aria-hidden />
              ) : (
                <ShoppingCart className="size-[18px]" aria-hidden />
              )}
            </button>
          </div>
        </div>
      </article>

      {quickViewOpen ? (
        <QuickView
          product={product}
          open={quickViewOpen}
          onClose={() => setQuickViewOpen(false)}
        />
      ) : null}
    </>
  );
}

export function ProductGrid({
  products,
  className,
}: {
  products: Product[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

/** Compact horizontal card for the cart, favourites and order summaries. */
export function ProductRowCard({
  product,
  right,
}: {
  product: Pick<Product, 'name' | 'slug' | 'image' | 'form'> & {
    category?: { slug: string } | null;
  };
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Link
        to={`/product/${product.slug}`}
        className="size-16 shrink-0 overflow-hidden rounded-xl border border-line bg-ground"
      >
        <ProductImage
          src={product.image}
          name={product.name}
          slug={product.slug}
          form={product.form}
          categorySlug={product.category?.slug ?? null}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to={`/product/${product.slug}`}
          className="line-clamp-2-safe text-sm font-semibold text-ink hover:underline"
        >
          {product.name}
        </Link>
      </div>
      {right}
    </div>
  );
}
