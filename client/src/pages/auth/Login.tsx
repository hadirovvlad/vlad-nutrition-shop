import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROLE_HOME, SHOP_DOMAIN } from '@/lib/constants';
import { useDocumentMeta } from '@/hooks';
import { ApiError } from '@/services';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { AuthShell } from './AuthShell';

/** Demo accounts, shown only outside production builds. */
const DEMO_ACCOUNTS = [
  { role: 'Адміністратор', email: `admin@${SHOP_DOMAIN}`, password: 'Admin1234' },
  { role: 'Менеджер', email: `manager@${SHOP_DOMAIN}`, password: 'Manager1234' },
  { role: 'Клієнт', email: `client@${SHOP_DOMAIN}`, password: 'Client1234' },
];

export function LoginPage() {
  useDocumentMeta('Вхід');

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    setPending(true);
    try {
      const user = await login(email, password);
      toast.success(`Вітаємо, ${user.name.split(' ')[0]}!`);
      navigate(from ?? ROLE_HOME[user.role], { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({ ...error.fieldErrors, form: error.message });
      } else {
        setErrors({ form: 'Щось пішло не так. Спробуйте ще раз.' });
      }
    } finally {
      setPending(false);
    }
  };

  const fill = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setErrors({});
  };

  return (
    <AuthShell
      title="Вхід в акаунт"
      subtitle="Введіть email і пароль, щоб продовжити."
      footer={
        <>
          Немає акаунта?{' '}
          <Link to="/register" className="font-bold text-ink underline underline-offset-2">
            Зареєструватися
          </Link>
        </>
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

        <Input
          label="Email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />

        <div>
          <Input
            label="Пароль"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
          />
          <div className="mt-2 text-right">
            <Link
              to="/forgot-password"
              className="text-[13px] font-semibold text-ink-muted hover:text-ink hover:underline"
            >
              Забули пароль?
            </Link>
          </div>
        </div>

        <Button type="submit" size="lg" fullWidth loading={pending}>
          Увійти
        </Button>
      </form>

      {import.meta.env.DEV ? (
        <div className="mt-7 rounded-2xl border border-dashed border-line-strong p-4">
          <p className="text-[11px] font-bold tracking-wider text-ink-faint uppercase">
            Демо-доступи
          </p>
          <div className="mt-2.5 space-y-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fill(account)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-ground"
              >
                <span className="font-semibold text-ink">{account.role}</span>
                <span className="truncate text-ink-muted">{account.email}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </AuthShell>
  );
}
