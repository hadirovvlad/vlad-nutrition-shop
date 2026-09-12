import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SHOP_NAME } from '@/lib/constants';
import { Logo } from '@/components/layout/Logo';

/** Shared frame for login, register and password recovery. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Link to="/" className="self-start">
          <Logo />
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-[28px] leading-tight font-extrabold text-ink">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-ink-muted">{subtitle}</p> : null}
          <div className="mt-7">{children}</div>
          {footer ? <div className="mt-6 text-center text-sm">{footer}</div> : null}
        </div>

        <p className="text-center text-xs text-ink-faint">
          © {new Date().getFullYear()} {SHOP_NAME}
        </p>
      </div>

      {/* Brand side */}
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div
          className="pointer-events-none absolute -top-1/4 -right-1/4 size-[50rem] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--color-lime) 0%, transparent 70%)' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(var(--color-lime) 1px, transparent 1px), linear-gradient(90deg, var(--color-lime) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
          aria-hidden
        />

        <div className="relative flex h-full flex-col justify-end p-12">
          <p className="text-[44px] leading-[0.95] font-black tracking-tight text-white">
            БУДУЙ
            <br />
            <span className="text-lime">СИЛЬНІШЕ</span>
            <br />
            ТІЛО
          </p>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/50">
            Особистий кабінет: історія замовлень, статуси доставки, обране та швидке повторне
            замовлення в два кліки.
          </p>
        </div>
      </div>
    </div>
  );
}
