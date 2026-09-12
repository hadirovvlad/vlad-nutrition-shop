import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

export function QuantityStepper({
  value,
  onChange,
  max = 99,
  min = 1,
  size = 'md',
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  max?: number;
  min?: number;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const dimensions = size === 'sm' ? 'h-9' : 'h-11';
  const button = size === 'sm' ? 'w-9' : 'w-11';

  return (
    <div
      className={cn(
        'inline-flex items-center overflow-hidden rounded-xl border border-line-strong bg-surface',
        dimensions,
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Зменшити кількість"
        className={cn(
          'flex h-full items-center justify-center text-ink transition-colors hover:bg-ground disabled:text-ink-faint disabled:hover:bg-transparent',
          button,
        )}
      >
        <Minus className="size-4" aria-hidden />
      </button>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        aria-label="Кількість"
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          if (Number.isNaN(parsed)) return;
          onChange(Math.max(min, Math.min(max, parsed)));
        }}
        className="h-full w-10 border-x border-line bg-transparent text-center text-sm font-bold text-ink tabular-nums outline-none"
      />

      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Збільшити кількість"
        className={cn(
          'flex h-full items-center justify-center text-ink transition-colors hover:bg-ground disabled:text-ink-faint disabled:hover:bg-transparent',
          button,
        )}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Pill selector for weight and flavour options. */
export function OptionPills({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string | null;
  onChange: (next: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-ink">
        {label}
        {value ? <span className="ml-1.5 font-normal text-ink-muted">{value}</span> : null}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={option === value}
            className={cn(
              'h-10 rounded-xl border px-3.5 text-[13px] font-semibold transition-all duration-150 active:scale-[0.97]',
              option === value
                ? 'border-ink bg-ink text-white'
                : 'border-line-strong bg-surface text-ink-soft hover:border-ink hover:text-ink',
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
