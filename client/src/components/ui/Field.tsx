import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

const CONTROL =
  'w-full rounded-xl border bg-surface px-3.5 text-sm text-ink placeholder:text-ink-faint ' +
  'transition-colors duration-150 outline-none focus:border-ink disabled:bg-ground disabled:text-ink-muted';

function Shell({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={id} className="text-[13px] font-semibold text-ink">
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type FieldMeta = { label?: string; hint?: string; error?: string; wrapperClassName?: string };

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldMeta>(
  function Input({ label, hint, error, wrapperClassName, className, id, ...props }, ref) {
    const generated = useId();
    const inputId = id ?? generated;
    return (
      <Shell
        id={inputId}
        label={label}
        hint={hint}
        error={error}
        required={props.required}
        className={wrapperClassName}
      >
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={cn(CONTROL, 'h-11', error && 'border-danger focus:border-danger', className)}
          {...props}
        />
      </Shell>
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & FieldMeta
>(function Textarea({ label, hint, error, wrapperClassName, className, id, ...props }, ref) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <Shell
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={props.required}
      className={wrapperClassName}
    >
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(
          CONTROL,
          'min-h-24 resize-y py-2.5 leading-relaxed',
          error && 'border-danger focus:border-danger',
          className,
        )}
        {...props}
      />
    </Shell>
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & FieldMeta
>(function Select({ label, hint, error, wrapperClassName, className, id, children, ...props }, ref) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <Shell
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={props.required}
      className={wrapperClassName}
    >
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={cn(
            CONTROL,
            'h-11 cursor-pointer appearance-none pr-9',
            error && 'border-danger focus:border-danger',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
    </Shell>
  );
});

export function Checkbox({
  label,
  count,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; count?: number }) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        'group flex cursor-pointer items-center gap-2.5 py-1 text-sm text-ink-soft transition-colors hover:text-ink',
        className,
      )}
    >
      <span className="relative flex size-[18px] shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          className="peer size-[18px] cursor-pointer appearance-none rounded-[6px] border border-line-strong bg-surface transition-colors checked:border-ink checked:bg-ink group-hover:border-ink-muted"
          {...props}
        />
        <svg
          className="pointer-events-none absolute size-3 text-lime opacity-0 transition-opacity peer-checked:opacity-100"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
        >
          <path
            d="M2.5 6.2 4.8 8.5 9.5 3.8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="flex-1">{label}</span>
      {count !== undefined ? (
        <span className="text-xs text-ink-faint tabular-nums">{count}</span>
      ) : null}
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group flex items-center gap-2.5 text-sm font-medium text-ink disabled:opacity-50"
    >
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-ink' : 'bg-line-strong',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked && 'translate-x-5',
          )}
        />
      </span>
      {label}
    </button>
  );
}

/** Segmented radio group used for delivery and payment choices. */
export function RadioCard({
  checked,
  onSelect,
  title,
  description,
  icon,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all duration-150',
        checked
          ? 'border-ink bg-ink/[0.03] shadow-[inset_0_0_0_1px_var(--color-ink)]'
          : 'border-line bg-surface hover:border-ink-faint',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          checked ? 'border-ink' : 'border-line-strong',
        )}
      >
        {checked ? <span className="size-2 rounded-full bg-ink" /> : null}
      </span>
      <span className="flex-1">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          {icon}
          {title}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs text-ink-muted">{description}</span>
        ) : null}
      </span>
    </button>
  );
}
