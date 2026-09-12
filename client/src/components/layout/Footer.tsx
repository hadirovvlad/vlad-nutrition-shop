import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Mail, MapPin, Phone, ShieldCheck, Truck, Undo2 } from 'lucide-react';
import { PICKUP_ADDRESS, SHOP_NAME, SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/constants';
import { telHref } from '@/lib/format';
import { catalogApi } from '@/services';
import { Logo } from './Logo';

const GUARANTEES = [
  { icon: ShieldCheck, title: 'Тільки оригінал', text: 'Прямі поставки від офіційних дистриб’юторів' },
  { icon: Truck, title: 'Доставка 1–2 дні', text: 'Нова Пошта по всій Україні або самовивіз' },
  { icon: Undo2, title: '14 днів на повернення', text: 'Якщо смак чи формат не підійшли' },
];

export function Footer() {
  const { data } = useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogApi.categories(),
    staleTime: 5 * 60_000,
  });

  const categories = (data?.items ?? []).slice(0, 8);

  return (
    <footer className="mt-16 bg-ink text-white">
      {/* Guarantees */}
      <div className="border-b border-white/10">
        <div className="container-page grid gap-6 py-10 sm:grid-cols-3">
          {GUARANTEES.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-lime">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold">{item.title}</p>
                  <p className="mt-0.5 text-xs text-white/60">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
            Спортивне харчування для тих, хто не зупиняється. Підбираємо асортимент так, щоб у ньому
            не було нічого зайвого.
          </p>
        </div>

        <nav>
          <h3 className="text-[11px] font-bold tracking-wider text-white/40 uppercase">Категорії</h3>
          <ul className="mt-4 space-y-2.5">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/catalog/${category.slug}`}
                  className="text-sm text-white/70 transition-colors hover:text-lime"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav>
          <h3 className="text-[11px] font-bold tracking-wider text-white/40 uppercase">Магазин</h3>
          <ul className="mt-4 space-y-2.5">
            {[
              { to: '/catalog', label: 'Весь каталог' },
              { to: '/sale', label: 'Акції' },
              { to: '/new', label: 'Новинки' },
              { to: '/brands', label: 'Бренди' },
              { to: '/about', label: 'Про нас' },
              { to: '/account/orders', label: 'Мої замовлення' },
            ].map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="text-sm text-white/70 transition-colors hover:text-lime"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="text-[11px] font-bold tracking-wider text-white/40 uppercase">Контакти</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a
                href={telHref(SUPPORT_PHONE)}
                className="flex items-center gap-2.5 font-semibold transition-colors hover:text-lime"
              >
                <Phone className="size-4 shrink-0 text-lime" aria-hidden />
                {SUPPORT_PHONE}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex items-center gap-2.5 text-white/70 transition-colors hover:text-lime"
              >
                <Mail className="size-4 shrink-0 text-lime" aria-hidden />
                {SUPPORT_EMAIL}
              </a>
            </li>
            <li className="flex items-start gap-2.5 text-white/70">
              <MapPin className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden />
              {PICKUP_ADDRESS}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SHOP_NAME}. Демонстраційний проєкт.
          </p>
          <p>Ціни вказано в гривнях. Не є лікарським засобом.</p>
        </div>
      </div>
    </footer>
  );
}
