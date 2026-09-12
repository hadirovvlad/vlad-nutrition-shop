import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';

export function PriceTag({
  price,
  oldPrice,
  size = 'md',
  className,
}: {
  price: number;
  oldPrice?: number | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const current = {
    sm: 'text-[15px]',
    md: 'text-lg',
    lg: 'text-[32px] leading-none',
  }[size];

  const previous = {
    sm: 'text-[11px]',
    md: 'text-xs',
    lg: 'text-base',
  }[size];

  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      <span className={cn('font-extrabold text-ink tabular-nums', current)}>
        {formatPrice(price)}
      </span>
      {oldPrice && oldPrice > price ? (
        <span className={cn('font-medium text-ink-faint line-through tabular-nums', previous)}>
          {formatPrice(oldPrice)}
        </span>
      ) : null}
    </div>
  );
}

export function StockStatus({
  stock,
  className,
  showCount = false,
}: {
  stock: number;
  className?: string;
  showCount?: boolean;
}) {
  if (stock <= 0) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold text-ink-faint', className)}>
        <span className="size-1.5 rounded-full bg-ink-faint" />
        Немає в наявності
      </span>
    );
  }

  // Low stock is a nudge, not an alarm — the threshold matches the panels.
  if (stock <= 5) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold text-warn', className)}>
        <span className="size-1.5 rounded-full bg-warn" />
        Закінчується{showCount ? ` · ${stock} шт.` : ''}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold text-ok', className)}>
      <span className="size-1.5 rounded-full bg-ok" />
      В наявності{showCount ? ` · ${stock} шт.` : ''}
    </span>
  );
}
