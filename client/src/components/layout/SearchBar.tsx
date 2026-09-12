import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, Tag, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { useClickOutside, useDebounced } from '@/hooks';
import { catalogApi } from '@/services';
import { ProductImage } from '@/components/product/ProductVisual';

export function SearchBar({
  autoFocus,
  onNavigate,
  className,
}: {
  autoFocus?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(term, 250);

  const containerRef = useClickOutside<HTMLDivElement>(open, () => setOpen(false));

  const { data, isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: ({ signal }) => catalogApi.search(debounced, signal),
    enabled: debounced.trim().length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (debounced.trim().length >= 2) setOpen(true);
  }, [debounced]);

  const go = (path: string) => {
    setOpen(false);
    setTerm('');
    onNavigate?.();
    navigate(path);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!term.trim()) return;
    go(`/catalog?q=${encodeURIComponent(term.trim())}`);
  };

  const hasResults =
    Boolean(data) &&
    (data!.products.length > 0 || data!.categories.length > 0 || data!.brands.length > 0);
  const showDropdown = open && debounced.trim().length >= 2;

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form onSubmit={submit} role="search">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            type="search"
            value={term}
            autoFocus={autoFocus}
            onChange={(event) => setTerm(event.target.value)}
            onFocus={() => term.trim().length >= 2 && setOpen(true)}
            placeholder="Пошук: протеїн, creatine, BCAA…"
            aria-label="Пошук товарів"
            className="h-11 w-full rounded-xl border border-line bg-surface pr-10 pl-11 text-sm text-ink transition-colors placeholder:text-ink-faint focus:border-ink focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {term ? (
            <button
              type="button"
              onClick={() => {
                setTerm('');
                setOpen(false);
              }}
              aria-label="Очистити пошук"
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1 text-ink-faint transition-colors hover:bg-ground hover:text-ink"
            >
              {isFetching ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <X className="size-4" aria-hidden />
              )}
            </button>
          ) : null}
        </div>
      </form>

      {/* The panel is wider than the input so product names stay readable. */}
      {showDropdown ? (
        <div className="absolute top-[calc(100%+8px)] right-0 left-0 z-50 max-h-[70vh] animate-slide-down overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-panel sm:left-auto sm:w-[26rem]">
          {isFetching && !data ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Шукаємо…
            </div>
          ) : !hasResults ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-semibold text-ink">
                За вашим запитом нічого не знайдено.
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Спробуйте інше слово або перегляньте каталог.
              </p>
            </div>
          ) : (
            <>
              {data!.categories.length > 0 ? (
                <section className="mb-1">
                  <p className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-ink-faint uppercase">
                    Категорії
                  </p>
                  {data!.categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => go(`/catalog/${category.slug}`)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-ground"
                    >
                      <Search className="size-4 text-ink-faint" aria-hidden />
                      {category.name}
                    </button>
                  ))}
                </section>
              ) : null}

              {data!.brands.length > 0 ? (
                <section className="mb-1">
                  <p className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-ink-faint uppercase">
                    Бренди
                  </p>
                  {data!.brands.map((brand) => (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => go(`/catalog?brand=${brand.slug}`)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-ground"
                    >
                      <Tag className="size-4 text-ink-faint" aria-hidden />
                      {brand.name}
                    </button>
                  ))}
                </section>
              ) : null}

              {data!.products.length > 0 ? (
                <section>
                  <p className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-ink-faint uppercase">
                    Товари
                  </p>
                  {data!.products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => go(`/product/${product.slug}`)}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-ground"
                    >
                      <span className="size-11 shrink-0 overflow-hidden rounded-lg border border-line bg-ground">
                        <ProductImage
                          src={product.image}
                          name={product.name}
                          slug={product.slug}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        {product.brand ? (
                          <span className="block text-[10px] font-bold tracking-wider text-ink-faint uppercase">
                            {product.brand}
                          </span>
                        ) : null}
                        <span className="line-clamp-2-safe block text-sm leading-snug font-semibold text-ink">
                          {product.name}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-ink tabular-nums">
                        {formatPrice(product.price)}
                      </span>
                    </button>
                  ))}
                </section>
              ) : null}

              {data!.total > data!.products.length ? (
                <button
                  type="button"
                  onClick={() => go(`/catalog?q=${encodeURIComponent(debounced.trim())}`)}
                  className="mt-1 w-full rounded-xl bg-ground px-3 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-white"
                >
                  Показати всі {data!.total} результати
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
