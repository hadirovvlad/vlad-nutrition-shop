import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Heart, LogOut, MapPin, Package, Settings, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ROLE_LABEL } from '@/lib/constants';
import { useScrollToTop } from '@/hooks';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';

const SECTIONS = [
  { to: '/account', label: 'Мої дані', icon: User, end: true },
  { to: '/account/orders', label: 'Мої замовлення', icon: Package, end: false },
  { to: '/account/favorites', label: 'Обране', icon: Heart, end: false },
  { to: '/account/addresses', label: 'Адреси доставки', icon: MapPin, end: false },
  { to: '/account/settings', label: 'Налаштування', icon: Settings, end: false },
];

export function AccountLayout() {
  useScrollToTop();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    toast.info('Ви вийшли з акаунта');
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="container-page flex-1 pb-20 sm:pb-0">
        <div className="py-6 sm:py-8">
          <h1 className="text-3xl font-extrabold text-ink sm:text-[40px]">Особистий кабінет</h1>
          {user ? (
            <p className="mt-2 text-sm text-ink-muted">
              {user.name} · {user.email} ·{' '}
              <span className="font-semibold text-ink">{ROLE_LABEL[user.role]}</span>
            </p>
          ) : null}
        </div>

        <div className="grid gap-6 pb-12 lg:grid-cols-[240px_1fr] lg:gap-8">
          {/* Section nav: a scrolling strip on mobile, a sidebar on desktop */}
          <nav className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <NavLink
                  key={section.to}
                  to={section.to}
                  end={section.end}
                  className={({ isActive }) =>
                    cn(
                      'flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-ink text-white'
                        : 'bg-surface text-ink-soft hover:bg-ink/5 hover:text-ink lg:bg-transparent',
                    )
                  }
                >
                  <Icon className="size-[18px]" aria-hidden />
                  {section.label}
                </NavLink>
              );
            })}

            <button
              type="button"
              onClick={handleLogout}
              className="flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap text-danger transition-colors hover:bg-danger-soft"
            >
              <LogOut className="size-[18px]" aria-hidden />
              Вихід
            </button>
          </nav>

          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
