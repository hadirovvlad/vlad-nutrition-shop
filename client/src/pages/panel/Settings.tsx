import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { useDocumentMeta } from '@/hooks';
import { ApiError, mgmtApi } from '@/services';
import { toast } from '@/store/toast';
import { PanelHeader } from '@/layouts/PanelLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { ErrorState, PageLoader } from '@/components/ui/feedback';

const FIELDS: { key: string; label: string; hint?: string; type?: string }[] = [
  { key: 'shopName', label: 'Назва магазину' },
  { key: 'announcement', label: 'Оголошення у шапці', hint: 'Показується у верхній смужці сайту' },
  { key: 'supportPhone', label: 'Телефон підтримки' },
  { key: 'supportEmail', label: 'Email підтримки', type: 'email' },
  {
    key: 'freeDeliveryFrom',
    label: 'Безкоштовна доставка від, ₴',
    type: 'number',
  },
  {
    key: 'lowStockThreshold',
    label: 'Порог «закінчується», шт.',
    hint: 'Впливає на попередження в дашборді',
    type: 'number',
  },
];

/** Admin-only screen: the server rejects this route for a manager. */
export function PanelSettingsPage() {
  useDocumentMeta('Налаштування — панель');

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['mgmt', 'settings'],
    queryFn: () => mgmtApi.settings(),
  });

  useEffect(() => {
    if (data) setValues(data.items);
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => mgmtApi.updateSettings(values),
    onSuccess: (result) => {
      toast.success(result.message);
      setValues(result.items);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        toast.error(error.message);
      }
    },
  });

  if (isLoading) return <PageLoader />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div>
      <PanelHeader
        title="Налаштування"
        description="Системні параметри магазину. Доступні лише адміністратору."
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-line bg-surface p-4">
        <Lock className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
        <p className="text-[13px] text-ink-soft">
          Менеджери не мають доступу до цього розділу — запит до нього повертає помилку 403 на
          сервері, а не лише приховує пункт меню.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setErrors({});
          mutation.mutate();
        }}
        className="max-w-xl rounded-2xl border border-line bg-surface p-5"
      >
        <div className="grid gap-4">
          {FIELDS.map((field) => (
            <Input
              key={field.key}
              label={field.label}
              hint={field.hint}
              type={field.type}
              value={values[field.key] ?? ''}
              onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
              error={errors[field.key]}
            />
          ))}
        </div>

        <Button type="submit" className="mt-5" loading={mutation.isPending}>
          Зберегти налаштування
        </Button>
      </form>
    </div>
  );
}
