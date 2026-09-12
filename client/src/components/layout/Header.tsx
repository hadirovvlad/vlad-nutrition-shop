import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  Truck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { FREE_DELIVERY_FROM, ROLE_LABEL, SHOP_NAME, SUPPORT_PHONE } from '@/lib/constants';
import { formatPrice, productsLabel, telHref } from '@/lib/format';
import { useClickOutside, useScrolled } from '@/hooks';
import { catalogApi } from '@/services';
import { useAuth } from '@/store/auth';
import { selectCartCount, useCartStore } from '@/store/cart';
import { selectFavoritesCount, useFavoritesStore } from '@/store/favorites';
import { Logo } from './Logo';
import { SearchBar } from './SearchBar';
import { Sheet } from '@/components/ui/overlay';

const NAV = [
  { to: '/catalog', label: 'Каталог' },
  { to: '/sale', label: 'Акції' },
  { to: '/new', label: 'Новинки' },
  { to: '/brands', label: 'Бренди' },
  { to: '/about', label: 'Про нас' },
];

/** The six categories promoted in the header, per the spec's menu sketch. */
const QUICK_CATEGORIES = [
  'protein',
  'creatine',
  'gainers',
  'vitamins',
  'amino-acids',
  'accessories',
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const scrolled = useScrolled(4);

  const [menuOpen, setMenuOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const cartCount = useCartStore(selectCartCount);
  const favoritesCount = useFavoritesStore(selectFavoritesCount);
  const { user, isAuthenticated, isStaff, logout } = useAuth();

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogApi.categories(),
    staleTime: 5 * 60_000,
  });

  const categories = categoriesData?.items ?? [];
  const quickCategories = QUICK_CATEGORIES.map((slug) =>
    categories.find((category) => category.slug === slug),
  ).filter((category): category is NonNullable<typeof category> => Boolean(category));

  const catalogRef = useClickOutside<HTMLDivElement>(catalogOpen, () => setCatalogOpen(false));
  const profileRef = useClickOutside<HTMLDivElement>(profileOpen, () => setProfileOpen(false));

  // Close every overlay when the route changes.
  useEffect(() => {
    setMenuOpen(false);
    setCatalogOpen(false);
    setProfileOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname, location.search]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const iconButton =
    'relative flex size-10 items-center justify-center rounded-xl text-ink transition-colors hover:bg-ink/5';

  return (
    <>
      {/* Announcement strip */}
      <div className="hidden bg-ink text-white lg:block">
        <div className="container-page flex h-9 items-center justify-between text-xs">
          <p className="flex items-center gap-1.5 font-medium">
            <Truck className="size-3.5 text-lime" aria-hidden />
            Безкоштовна доставка від {formatPrice(FREE_DELIVERY_FROM)}
          </p>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5 text-white/70">
              <Sparkles className="size-3.5 text-lime" aria-hidden />
              Лише оригінальні бренди
            </span>
            <a href={telHref(SUPPORT_PHONE)} className="font-semibold hover:text-lime">
              {SUPPORT_PHONE}
            </a>
          </div>
        </div>
      </div>

      <header
        className={cn(
          'sticky top-0 z-50 border-b bg-surface/95 backdrop-blur-md transition-shadow duration-200',
          scrolled ? 'border-line shadow-soft' : 'border-transparent',
        )}
      >
        <div className="container-page flex h-16 items-center gap-3 lg:h-[72px] lg:gap-6">
          {/* Mobile: burger */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Відкрити меню"
            className={cn(iconButton, '-ml-2 lg:hidden')}
          >
            <Menu className="size-5" aria-hidden />
          </button>

          <Link to="/" className="shrink-0" aria-label={`${SHOP_NAME} — на головну`}>
            <Logo />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            <div ref={catalogRef} className="relative">
              <button
                type="button"
                onClick={() => setCatalogOpen((open) => !open)}
                aria-expanded={catalogOpen}
                className={cn(
                  'flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors',
                  catalogOpen ? 'bg-ink text-white' : 'text-ink hover:bg-ink/5',
                )}
              >
                Каталог
                <ChevronDown
                  className={cn('size-4 transition-transform', catalogOpen && 'rotate-180')}
                  aria-hidden
                />
              </button>

              {catalogOpen ? (
                <div className="absolute top-[calc(100%+8px)] left-0 z-50 w-[min(44rem,88vw)] animate-slide-down rounded-2xl border border-line bg-surface p-4 shadow-panel">
                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        to={`/catalog/${category.slug}`}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-ground"
                      >
                        <span className="text-lg leading-none" aria-hidden>
                          {category.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">
                            {category.name}
                          </span>
                          <span className="block text-[11px] text-ink-faint">
                            {productsLabel(category.productCount)}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                  <Link
                    to="/catalog"
                    className="mt-3 block rounded-xl bg-ground px-4 py-2.5 text-center text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-white"
                  >
                    Всі товари каталогу
                  </Link>
                </div>
              ) : null}
            </div>

            {NAV.slice(1).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex h-10 items-center rounded-xl px-3 text-sm font-semibold transition-colors',
                    isActive ? 'bg-ink/5 text-ink' : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Search — desktop */}
          <div className="ml-auto hidden max-w-md flex-1 md:block">
            <SearchBar />
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-0.5 md:ml-0">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Пошук"
              className={cn(iconButton, 'md:hidden')}
            >
              <Search className="size-5" aria-hidden />
            </button>

            <Link
              to="/account/favorites"
              aria-label="Обране"
              className={cn(iconButton, 'hidden sm:flex')}
            >
              <Heart className="size-5" aria-hidden />
              {favoritesCount > 0 ? <Counter value={favoritesCount} /> : null}
            </Link>

            {/* Profile */}
            <div ref={profileRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-label="Профіль"
                aria-expanded={profileOpen}
                className={cn(iconButton, profileOpen && 'bg-ink/5')}
              >
                <UserIcon className="size-5" aria-hidden />
              </button>

              {profileOpen ? (
                <div className="absolute top-[calc(100%+8px)] right-0 z-50 w-64 animate-slide-down rounded-2xl border border-line bg-surface p-2 shadow-panel">
                  {isAuthenticated ? (
                    <>
                      <div className="px-3 py-2.5">
                        <p className="truncate text-sm font-bold text-ink">{user!.name}</p>
                        <p className="truncate text-xs text-ink-muted">{user!.email}</p>
                        <span className="mt-1.5 inline-block rounded-md bg-lime-soft px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-ink uppercase">
                          {ROLE_LABEL[user!.role]}
                        </span>
                      </div>
                      <div className="my-1 h-px bg-line" />

                      {isStaff ? (
                        <MenuItem
                          to={user!.role === 'ADMIN' ? '/admin' : '/manager'}
                          icon={<LayoutDashboard className="size-4" aria-hidden />}
                          label={user!.role === 'ADMIN' ? 'Панель адміністратора' : 'Панель менеджера'}
                        />
                      ) : null}

                      <MenuItem
                        to="/account"
                        icon={<UserIcon className="size-4" aria-hidden />}
                        label="Мої дані"
                      />
                      <MenuItem
                        to="/account/orders"
                        icon={<Package className="size-4" aria-hidden />}
                        label="Мої замовлення"
                      />
                      <MenuItem
                        to="/account/favorites"
                        icon={<Heart className="size-4" aria-hidden />}
                        label="Обране"
                      />

                      <div className="my-1 h-px bg-line" />
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
                      >
                        <LogOut className="size-4" aria-hidden />
                        Вихід
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="px-3 py-2 text-xs text-ink-muted">
                        Увійдіть, щоб бачити замовлення та обране.
                      </p>
                      <Link
                        to="/login"
                        className="mt-1 block rounded-xl bg-ink px-3 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-ink-soft"
                      >
                        Увійти
                      </Link>
                      <Link
                        to="/register"
                        className="mt-1.5 block rounded-xl px-3 py-2.5 text-center text-sm font-semibold text-ink transition-colors hover:bg-ground"
                      >
                        Створити акаунт
                      </Link>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            <Link
              to="/cart"
              aria-label="Кошик"
              className={cn(iconButton, 'bg-lime text-ink hover:bg-lime-dark')}
            >
              <ShoppingBag className="size-5" aria-hidden />
              {cartCount > 0 ? <Counter value={cartCount} dark /> : null}
            </Link>
          </div>
        </div>

        {/* Quick category strip */}
        <div className="hidden border-t border-line lg:block">
          <div className="container-page no-scrollbar flex h-11 items-center gap-1 overflow-x-auto">
            {quickCategories.map((category) => (
              <NavLink
                key={category.id}
                to={`/catalog/${category.slug}`}
                className={({ isActive }) =>
                  cn(
                    'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
                    isActive ? 'bg-ink text-white' : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
                  )
                }
              >
                <span aria-hidden>{category.icon}</span>
                {category.name}
              </NavLink>
            ))}
          </div>
        </div>
      </header>

      {/* Mobile search overlay */}
      {mobileSearchOpen ? (
        <div className="fixed inset-0 z-100 bg-surface md:hidden">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <div className="flex-1">
              <SearchBar autoFocus onNavigate={() => setMobileSearchOpen(false)} />
            </div>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Закрити пошук"
              className="flex size-10 items-center justify-center rounded-xl text-ink-muted hover:bg-ground"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}

      {/* Mobile menu */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Меню" side="left">
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'rounded-xl px-3 py-3 text-sm font-bold transition-colors',
                  isActive ? 'bg-ink text-white' : 'text-ink hover:bg-ground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="my-4 h-px bg-line" />

        <p className="mb-2 px-3 text-[11px] font-bold tracking-wider text-ink-faint uppercase">
          Категорії
        </p>
        <nav className="flex flex-col gap-0.5">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/catalog/${category.slug}`}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-ground hover:text-ink"
            >
              <span aria-hidden>{category.icon}</span>
              <span className="flex-1">{category.name}</span>
              <span className="text-[11px] text-ink-faint tabular-nums">
                {category.productCount}
              </span>
            </Link>
          ))}
        </nav>

        <div className="my-4 h-px bg-line" />

        {isAuthenticated ? (
          <div className="flex flex-col gap-0.5">
            {isStaff ? (
              <Link
                to={user!.role === 'ADMIN' ? '/admin' : '/manager'}
                className="rounded-xl px-3 py-2.5 text-sm font-bold text-ink hover:bg-ground"
              >
                {user!.role === 'ADMIN' ? 'Панель адміністратора' : 'Панель менеджера'}
              </Link>
            ) : null}
            <Link
              to="/account"
              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink hover:bg-ground"
            >
              Особистий кабінет
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-danger hover:bg-danger-soft"
            >
              Вихід
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Link
              to="/login"
              className="rounded-xl bg-ink px-3 py-3 text-center text-sm font-bold text-white"
            >
              Увійти
            </Link>
            <Link
              to="/register"
              className="rounded-xl border border-line-strong px-3 py-3 text-center text-sm font-semibold text-ink"
            >
              Реєстрація
            </Link>
          </div>
        )}
      </Sheet>
    </>
  );
}

function Counter({ value, dark }: { value: number; dark?: boolean }) {
  return (
    <span
      className={cn(
        'absolute -top-0.5 -right-0.5 flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] leading-[18px] font-bold tabular-nums',
        dark ? 'bg-ink text-lime' : 'bg-ink text-white',
      )}
    >
      {value > 99 ? '99+' : value}
    </span>
  );
}

function MenuItem({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ground"
    >
      {icon}
      {label}
    </Link>
  );
}
