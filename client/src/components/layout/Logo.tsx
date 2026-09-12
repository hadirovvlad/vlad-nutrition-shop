import { cn } from '@/lib/cn';
import { SHOP_NAME } from '@/lib/constants';

/**
 * Wordmark. "VLAD NUTRITION" is too long for one heavy line in a 375px header,
 * so the two words are stacked: "VLAD" carries the weight, "NUTRITION" sits
 * under it as a tracked-out subline. The lockup stays under 150px wide.
 */
export function Logo({
  className,
  tone = 'dark',
}: {
  className?: string;
  tone?: 'dark' | 'light';
}) {
  const [first, second] = SHOP_NAME.split(' ');

  return (
    <span className={cn('flex items-center gap-2', className)} aria-label={SHOP_NAME}>
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-[11px] text-[19px] leading-none font-black',
          tone === 'dark' ? 'bg-ink text-lime' : 'bg-lime text-ink',
        )}
        aria-hidden
      >
        {first.charAt(0)}
      </span>

      <span className="flex flex-col justify-center">
        <span
          className={cn(
            'text-[17px] leading-[1.05] font-black tracking-tight sm:text-[19px]',
            tone === 'dark' ? 'text-ink' : 'text-white',
          )}
        >
          {first}
        </span>
        <span
          className={cn(
            'text-[8.5px] leading-[1.1] font-bold tracking-[0.22em] sm:text-[9.5px]',
            tone === 'dark' ? 'text-ink-muted' : 'text-lime',
          )}
        >
          {second}
        </span>
      </span>
    </span>
  );
}
