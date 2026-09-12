import { NavLink } from 'react-router-dom';
import { Grid2x2, Heart, Home, ShoppingBag, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { selectCartCount, useCartStore } from '@/store/cart';
import { selectFavoritesCount, useFavoritesStore } from '@/store/favorites';

const ITEMS = [
  { to: '/', label: 'Головна', icon: Home, end: true },
  { to: '/catalog', label: 'Каталог', icon: Grid2x2, end: false },
  { to: '/account/favorites', label: 'Обране', icon: Heart, end: false, badge: 'favorites' },
  { to: '/cart', label: 'Кошик', icon: ShoppingBag, end: false, badge: 'cart' },
  { to: '/account', label: 'Профіль', icon: User, end: true },
] as const;

/** Mobile bottom navigation — the cart is always one tap away. */
export function BottomNav() {
  const cartCount = useCartStore(selectCartCount);
  const favoritesCount = useFavoritesStore(selectFavoritesCount);

  const counts: Record<string, number> = { cart: cartCount, favorites: favoritesCount };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
      aria-label="Основна навігація"
    >
      <div className="flex items-stretch">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const badge = 'badge' in item ? counts[item.badge] : 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors',
                  isActive ? 'text-ink' : 'text-ink-faint',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon
                      className={cn('size-[22px]', isActive && 'stroke-[2.4]')}
                      aria-hidden
                    />
                    {badge > 0 ? (
                      <span className="absolute -top-1 -right-2 flex min-w-[16px] items-center justify-center rounded-full bg-lime px-1 text-[9px] leading-4 font-bold text-ink tabular-nums">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    ) : null}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
