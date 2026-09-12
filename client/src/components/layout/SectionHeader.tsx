import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export function SectionHeader({
  eyebrow,
  title,
  description,
  linkTo,
  linkLabel = 'Дивитись усі',
  className,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  linkTo?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 flex items-end justify-between gap-4 sm:mb-8', className)}>
      <div>
        {eyebrow ? (
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] text-ink-faint uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-extrabold text-ink sm:text-[32px]">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-xl text-sm text-ink-muted sm:text-[15px]">{description}</p>
        ) : null}
      </div>

      {linkTo ? (
        <Link
          to={linkTo}
          className="group hidden shrink-0 items-center gap-1.5 text-sm font-bold text-ink underline-offset-4 hover:underline sm:flex"
        >
          {linkLabel}
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      ) : null}
    </div>
  );
}
