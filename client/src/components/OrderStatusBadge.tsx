import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '@/lib/constants';
import type { OrderStatus } from '@/types';

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] leading-none font-bold tracking-wide whitespace-nowrap uppercase',
        ORDER_STATUS_TONE[status],
        className,
      )}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

/** Horizontal progress of an order through its statuses. */
export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED') {
    return (
      <div className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
        Замовлення скасовано
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(status);

  return (
    <ol className="flex items-start">
      {ORDER_STATUS_FLOW.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;

        return (
          <li key={step} className="flex flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span
                className={cn(
                  'h-1 flex-1 rounded-full',
                  index === 0 ? 'bg-transparent' : done || active ? 'bg-ink' : 'bg-line',
                )}
              />
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-colors',
                  done
                    ? 'border-ink bg-ink text-lime'
                    : active
                      ? 'border-ink bg-lime text-ink'
                      : 'border-line bg-surface text-ink-faint',
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : index + 1}
              </span>
              <span
                className={cn(
                  'h-1 flex-1 rounded-full',
                  index === ORDER_STATUS_FLOW.length - 1
                    ? 'bg-transparent'
                    : done
                      ? 'bg-ink'
                      : 'bg-line',
                )}
              />
            </div>
            <span
              className={cn(
                'mt-2 px-1 text-[11px] leading-tight',
                active ? 'font-bold text-ink' : 'text-ink-muted',
              )}
            >
              {ORDER_STATUS_LABEL[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
