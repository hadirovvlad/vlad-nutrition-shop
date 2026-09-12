import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { useDocumentMeta } from '@/hooks';
import { ApiError, authApi } from '@/services';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { AuthShell } from './AuthShell';

export function ForgotPasswordPage() {
  useDocumentMeta('Відновлення пароля');

  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<{ message: string; devToken?: string } | null>(null);
  const [error, setError] = useState<string>();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    setPending(true);
    try {
      const result = await authApi.forgotPassword({ email });
      setSent(result);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Не вдалося надіслати запит');
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <AuthShell
        title="Перевірте пошту"
        subtitle={sent.message}
        footer={
          <Link to="/login" className="font-bold text-ink underline underline-offset-2">
            Повернутися до входу
          </Link>
        }
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-lime-soft">
          <MailCheck className="size-7 text-ink" aria-hidden />
        </div>

        {sent.devToken ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line-strong p-4">
            <p className="text-[11px] font-bold tracking-wider text-ink-faint uppercase">
              Режим розробки
            </p>
            <p className="mt-1.5 text-[13px] text-ink-muted">
              Поштовий сервіс не підключено, тому токен показано тут.
            </p>
            <Link
              to={`/reset-password?token=${sent.devToken}`}
              className="mt-3 inline-flex h-10 items-center rounded-xl bg-ink px-4 text-[13px] font-bold text-white hover:bg-ink-soft"
            >
              Задати новий пароль
            </Link>
          </div>
        ) : null}
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Відновлення пароля"
      subtitle="Вкажіть email, і ми надішлемо інструкції."
      footer={
        <Link to="/login" className="font-bold text-ink underline underline-offset-2">
          Повернутися до входу
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={error}
        />
        <Button type="submit" size="lg" fullWidth loading={pending}>
          Надіслати інструкції
        </Button>
      </form>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  useDocumentMeta('Новий пароль');

  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(params.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    if (password !== confirm) {
      setErrors({ confirm: 'Паролі не збігаються' });
      return;
    }

    setPending(true);
    try {
      const result = await authApi.resetPassword({ token, password });
      toast.success(result.message);
      navigate('/login', { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors({ ...caught.fieldErrors, form: caught.message });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell
      title="Новий пароль"
      subtitle="Задайте пароль, який ви запам’ятаєте."
      footer={
        <Link to="/login" className="font-bold text-ink underline underline-offset-2">
          Повернутися до входу
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {errors.form ? (
          <p
            role="alert"
            className="rounded-xl bg-danger-soft px-3.5 py-3 text-[13px] font-medium text-danger"
          >
            {errors.form}
          </p>
        ) : null}

        {!params.get('token') ? (
          <Input
            label="Токен з листа"
            required
            value={token}
            onChange={(event) => setToken(event.target.value)}
            error={errors.token}
          />
        ) : null}

        <Input
          label="Новий пароль"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Мінімум 8 символів"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
        />
        <Input
          label="Повторіть пароль"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={errors.confirm}
        />

        <Button type="submit" size="lg" fullWidth loading={pending}>
          Зберегти пароль
        </Button>
      </form>
    </AuthShell>
  );
}
