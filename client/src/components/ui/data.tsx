import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { cn } from '@/lib/cn';

/* ---------------------------------- rating -------------------------------- */

export function Rating({
  value,
  count,
  size = 'sm',
  showValue = false,
  className,
}: {
  value: number;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}) {
  const dimensions = { sm: 'size-3.5', md: 'size-4', lg: 'size-5' };
  const rounded = Math.round(value);

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex items-center gap-0.5" aria-label={`Рейтинг ${value} з 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              dimensions[size],
              star <= rounded ? 'fill-lime-dark text-lime-dark' : 'fill-line text-line',
            )}
            aria-hidden
          />
        ))}
      </div>
      {showValue && value > 0 ? (
        <span className="text-xs font-bold text-ink tabular-nums">{value.toFixed(1)}</span>
      ) : null}
      {count !== undefined ? (
        <span className="text-xs text-ink-muted tabular-nums">({count})</span>
      ) : null}
    </div>
  );
}

/** Interactive star picker for the review form. */
export function RatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Ваша оцінка">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} з 5`}
          onClick={() => onChange(star)}
          className="rounded-lg p-1 transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className={cn(
              'size-7',
              star <= value ? 'fill-lime-dark text-lime-dark' : 'fill-line text-line',
            )}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

/* -------------------------------- pagination ------------------------------ */

export function Pagination({
  page,
  pages,
  onChange,
  className,
}: {
  page: number;
  pages: number;
  onChange: (next: number) => void;
  className?: string;
}) {
  if (pages <= 1) return null;

  // Show first, last, current and its neighbours; gaps become an ellipsis.
  const numbers: (number | 'gap')[] = [];
  for (let index = 1; index <= pages; index += 1) {
    if (index === 1 || index === pages || Math.abs(index - page) <= 1) {
      numbers.push(index);
    } else if (numbers[numbers.length - 1] !== 'gap') {
      numbers.push('gap');
    }
  }

  const buttonClass =
    'flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-colors';

  return (
    <nav className={cn('flex items-center justify-center gap-1.5', className)} aria-label="Сторінки">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Попередня сторінка"
        className={cn(buttonClass, 'border-line bg-surface hover:border-ink disabled:opacity-40')}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>

      {numbers.map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-ink-faint">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              buttonClass,
              item === page
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-surface hover:border-ink',
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        aria-label="Наступна сторінка"
        className={cn(buttonClass, 'border-line bg-surface hover:border-ink disabled:opacity-40')}
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  );
}

/* ----------------------------------- tabs --------------------------------- */

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { value: T; label: string; count?: number }[];
  active: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn('no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1', className)}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === active}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors',
            tab.value === active
              ? 'bg-ink text-white'
              : 'bg-surface text-ink-soft hover:bg-ink/5 hover:text-ink',
          )}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
                tab.value === active ? 'bg-white/15 text-white' : 'bg-ink/8 text-ink-muted',
              )}
            >
              {tab.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------- table --------------------------------- */

export function DataTable({
  head,
  children,
  className,
}: {
  head: ReactNode[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft',
        className,
      )}
    >
      <table className="w-full min-w-[46rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-ground">
            {head.map((cell, index) => (
              <th
                key={index}
                className="px-4 py-3 text-left text-[11px] font-bold tracking-wide text-ink-muted uppercase whitespace-nowrap"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-line transition-colors last:border-0',
        onClick && 'cursor-pointer hover:bg-ground',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Cell({
  children,
  className,
  align = 'left',
}: {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <td
      className={cn(
        'px-4 py-3.5 align-middle text-ink-soft',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

/* ------------------------------- stat tiles ------------------------------- */

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: 'default' | 'accent' | 'warn' | 'danger';
}) {
  const tones = {
    default: 'bg-surface border-line',
    accent: 'bg-lime-soft border-lime',
    warn: 'bg-warn-soft border-warn-soft',
    danger: 'bg-danger-soft border-danger-soft',
  };

  return (
    <div className={cn('rounded-2xl border p-4 sm:p-5', tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-semibold tracking-wide text-ink-muted uppercase">{label}</p>
        {icon ? <span className="text-ink-muted">{icon}</span> : null}
      </div>
      {/* Money values must not break between the amount and the ₴ sign. */}
      <p className="mt-2 text-2xl font-extrabold whitespace-nowrap text-ink tabular-nums sm:text-[26px]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}
