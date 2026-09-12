import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BadgePercent,
  Boxes,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  Package,
  Settings,
  ShoppingCart,
  Tags,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { ROLE_LABEL } from '@/lib/constants';
import { useScrollToTop } from '@/hooks';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { Logo } from '@/components/layout/Logo';
import type { Role } from '@/types';

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  roles: Role[];
};

/**
 * One navigation definition serves both panels. The `roles` field mirrors the
 * server's route guards, so a manager never sees a link that would 403.
 */
function buildNav(base: string): NavItem[] {
  return [
    { to: base, label: 'Dashboard', icon: LayoutDashboard, end: true, roles: ['ADMIN', 'MANAGER'] },
    { to: `${base}/orders`, label: 'Замовлення', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER'] },
    { to: `${base}/products`, label: 'Товари', icon: Package, roles: ['ADMIN', 'MANAGER'] },
    { to: `${base}/categories`, label: 'Категорії', icon: FolderTree, roles: ['ADMIN'] },
    { to: `${base}/brands`, label: 'Бренди', icon: Tags, roles: ['ADMIN'] },
    { to: `${base}/customers`, label: 'Клієнти', icon: Users, roles: ['ADMIN', 'MANAGER'] },
    { to: `${base}/managers`, label: 'Менеджери', icon: UserCog, roles: ['ADMIN'] },
    { to: `${base}/stock`, label: 'Склад', icon: Boxes, roles: ['ADMIN', 'MANAGER'] },
    { to: `${base}/promotions`, label: 'Акції', icon: BadgePercent, roles: ['ADMIN', 'MANAGER'] },
    { to: `${base}/reviews`, label: 'Відгуки', icon: MessageSquareQuote, roles: ['ADMIN'] },
    { to: `${base}/settings`, label: 'Налаштування', icon: Settings, roles: ['ADMIN'] },
  ];
}

export function PanelLayout({ base }: { base: '/admin' | '/manager' }) {
  useScrollToTop();

  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = buildNav(base).filter((item) => (user ? item.roles.includes(user.role) : false));

  const handleLogout = async () => {
    await logout();
    toast.info('Ви вийшли з панелі');
    navigate('/');
  };

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-lime text-ink'
                  : 'text-white/60 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <Icon className="size-[18px] shrink-0" aria-hidden />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="flex items-center justify-between gap-2 px-3 pt-1 pb-5">
        <Link to="/" className="flex items-center gap-2">
          <Logo tone="light" />
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          aria-label="Закрити меню"
          className="flex size-9 items-center justify-center rounded-xl text-white/50 hover:bg-white/5 hover:text-white lg:hidden"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="mb-4 rounded-xl bg-white/5 px-3 py-2.5">
        <p className="truncate text-[13px] font-bold text-white">{user?.name}</p>
        <p className="mt-0.5 text-[11px] font-semibold tracking-wide text-lime uppercase">
          {user ? ROLE_LABEL[user.role] : ''}
        </p>
      </div>

      {nav}

      <div className="mt-auto space-y-0.5 pt-5">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ExternalLink className="size-[18px]" aria-hidden />
          Перейти в магазин
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
        >
          <LogOut className="size-[18px]" aria-hidden />
          Вихід
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-ink px-3 py-4 lg:flex">
        {sidebarInner}
      </aside>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-100 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-ink/50"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <aside className="absolute top-0 bottom-0 left-0 flex w-[min(17rem,85vw)] animate-slide-left flex-col bg-ink px-3 py-4">
            {sidebarInner}
          </aside>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Відкрити меню"
            className="-ml-2 flex size-10 items-center justify-center rounded-xl text-ink hover:bg-ink/5"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <span className="text-sm font-extrabold text-ink">
            {base === '/admin' ? 'Адмін-панель' : 'Панель менеджера'}
          </span>
        </header>

        <main className="px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Shared page heading inside the panels. */
export function PanelHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
