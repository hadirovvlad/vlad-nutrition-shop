import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDocumentMeta } from '@/hooks';
import { accountApi, ApiError } from '@/services';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input } from '@/components/ui/Field';
import { ConfirmDialog, Modal } from '@/components/ui/overlay';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import type { Address } from '@/types';

type FormState = Omit<Address, 'id'>;

const BLANK: FormState = {
  label: 'Основна',
  city: '',
  warehouse: '',
  recipient: '',
  phone: '',
  isDefault: false,
};

export function AccountAddressesPage() {
  useDocumentMeta('Адреси доставки');

  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Address | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['account', 'addresses'],
    queryFn: () => accountApi.addresses(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['account', 'addresses'] });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? accountApi.updateAddress(editing.id, form)
        : accountApi.createAddress(form),
    onSuccess: () => {
      toast.success(editing ? 'Адресу оновлено ✓' : 'Адресу додано ✓');
      close();
      void invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError) setErrors(error.fieldErrors);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => accountApi.deleteAddress(id),
    onSuccess: () => {
      toast.info('Адресу видалено');
      setDeleting(null);
      void invalidate();
    },
  });

  const open = (address?: Address) => {
    setErrors({});
    if (address) {
      setEditing(address);
      setForm({
        label: address.label,
        city: address.city,
        warehouse: address.warehouse,
        recipient: address.recipient ?? '',
        phone: address.phone ?? '',
        isDefault: address.isDefault,
      });
    } else {
      setEditing(null);
      setCreating(true);
      setForm(BLANK);
    }
  };

  const close = () => {
    setEditing(null);
    setCreating(false);
    setErrors({});
  };

  if (isError) {
    return <ErrorState description="Не вдалося завантажити адреси." onRetry={() => void refetch()} />;
  }

  const addresses = data?.items ?? [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-ink-muted">
          Збережені адреси підставляються під час оформлення замовлення.
        </p>
        <Button onClick={() => open()}>
          <Plus className="size-4" aria-hidden />
          Додати
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin className="size-6" aria-hidden />}
          title="Адрес ще немає"
          description="Додайте адресу відділення Нової Пошти, щоб оформлювати замовлення швидше."
          action={<Button onClick={() => open()}>Додати адресу</Button>}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <li
              key={address.id}
              className={cn(
                'relative rounded-2xl border bg-surface p-5',
                address.isDefault ? 'border-ink' : 'border-line',
              )}
            >
              {address.isDefault ? (
                <span className="absolute top-4 right-4 rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold tracking-wide text-ink uppercase">
                  Основна
                </span>
              ) : null}

              <p className="text-sm font-extrabold text-ink">{address.label}</p>
              <p className="mt-2 text-[13px] text-ink-soft">{address.city}</p>
              <p className="text-[13px] text-ink-soft">{address.warehouse}</p>
              {address.recipient ? (
                <p className="mt-2 text-[13px] text-ink-muted">{address.recipient}</p>
              ) : null}
              {address.phone ? (
                <p className="text-[13px] text-ink-muted">{address.phone}</p>
              ) : null}

              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => open(address)}>
                  <Pencil className="size-3.5" aria-hidden />
                  Змінити
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:bg-danger-soft"
                  onClick={() => setDeleting(address)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Видалити
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={creating || Boolean(editing)}
        onClose={close}
        title={editing ? 'Змінити адресу' : 'Нова адреса'}
        footer={
          <>
            <Button variant="outline" onClick={close}>
              Скасувати
            </Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
              Зберегти
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Input
            label="Назва адреси"
            placeholder="Дім, Робота…"
            value={form.label}
            onChange={(event) => setForm({ ...form, label: event.target.value })}
            error={errors.label}
          />
          <Input
            label="Місто"
            required
            placeholder="Київ"
            value={form.city}
            onChange={(event) => setForm({ ...form, city: event.target.value })}
            error={errors.city}
          />
          <Input
            label="Відділення / поштомат"
            required
            placeholder="Відділення №12 (вул. Хрещатик, 22)"
            value={form.warehouse}
            onChange={(event) => setForm({ ...form, warehouse: event.target.value })}
            error={errors.warehouse}
          />
          <Input
            label="Отримувач"
            placeholder="Якщо відрізняється від власника акаунта"
            value={form.recipient ?? ''}
            onChange={(event) => setForm({ ...form, recipient: event.target.value })}
            error={errors.recipient}
          />
          <Input
            label="Телефон отримувача"
            type="tel"
            value={form.phone ?? ''}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            error={errors.phone}
          />
          <Checkbox
            label="Зробити основною адресою"
            checked={form.isDefault}
            onChange={(event) => setForm({ ...form, isDefault: event.target.checked })}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Видалити адресу?"
        description={`«${deleting?.label}» буде видалено з ваших адрес.`}
        confirmLabel="Видалити"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
