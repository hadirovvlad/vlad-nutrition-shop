import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useToastStore, type ToastTone } from '@/store/toast';

const ICONS: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const ACCENTS: Record<ToastTone, string> = {
  success: 'text-lime',
  error: 'text-danger',
  info: 'text-white',
};

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (!toasts.length) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-200 flex flex-col items-center gap-2 px-4 sm:top-auto sm:right-6 sm:bottom-6 sm:left-auto sm:items-end sm:px-0"
      role="status"
      aria-live="polite"
    >
      {toasts.map((item) => {
        const Icon = ICONS[item.tone];
        return (
          <div
            key={item.id}
            className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-2xl bg-ink px-4 py-3.5 text-white shadow-panel"
          >
            <Icon className={cn('mt-0.5 size-5 shrink-0', ACCENTS[item.tone])} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{item.message}</p>
              {item.description ? (
                <p className="mt-0.5 text-xs text-white/70">{item.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Закрити повідомлення"
              className="-mr-1 shrink-0 rounded-lg p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
