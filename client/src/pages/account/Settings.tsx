import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, LogOut } from 'lucide-react';
import { useDocumentMeta } from '@/hooks';
import { ApiError, authApi } from '@/services';
import { useAuth } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/overlay';

export function AccountSettingsPage() {
  useDocumentMeta('Налаштування');

  const navigate = useNavigate();
  const { logout } = useAuth();
  const clearCart = useCartStore((state) => state.clear);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoutOpen, setLogoutOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: (result) => {
      toast.success(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setErrors({});
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setErrors({ ...error.fieldErrors, form: error.details ? '' : error.message });
      }
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    if (newPassword !== confirm) {
      setErrors({ confirm: 'Паролі не збігаються' });
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-ink/5 text-ink">
            <KeyRound className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-ink">Зміна пароля</h2>
            <p className="text-[13px] text-ink-muted">Мінімум 8 символів.</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-5 grid max-w-md gap-4">
          {errors.form ? (
            <p
              role="alert"
              className="rounded-xl bg-danger-soft px-3.5 py-3 text-[13px] font-medium text-danger"
            >
              {errors.form}
            </p>
          ) : null}

          <Input
            label="Поточний пароль"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            error={errors.currentPassword}
          />
          <Input
            label="Новий пароль"
            type="password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            error={errors.newPassword}
          />
          <Input
            label="Повторіть новий пароль"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            error={errors.confirm}
          />

          <Button type="submit" loading={mutation.isPending} className="justify-self-start">
            Змінити пароль
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-ink">Сесія</h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          Вихід очистить кошик та обране на цьому пристрої.
        </p>
        <Button
          variant="outline"
          className="mt-4 border-danger text-danger hover:bg-danger-soft"
          onClick={() => setLogoutOpen(true)}
        >
          <LogOut className="size-4" aria-hidden />
          Вийти з акаунта
        </Button>
      </section>

      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={async () => {
          clearCart();
          await logout();
          toast.info('Ви вийшли з акаунта');
          navigate('/');
        }}
        title="Вийти з акаунта?"
        description="Ви зможете увійти знову в будь-який момент."
        confirmLabel="Вийти"
      />
    </div>
  );
}
