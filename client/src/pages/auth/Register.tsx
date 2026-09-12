import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useDocumentMeta } from '@/hooks';
import { ApiError } from '@/services';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { AuthShell } from './AuthShell';

const BENEFITS = [
  'Історія та статуси замовлень',
  'Обране на всіх пристроях',
  'Збережені адреси доставки',
];

export function RegisterPage() {
  useDocumentMeta('Реєстрація');

  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((previous) => ({ ...previous, [key]: event.target.value }));
    setErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    setPending(true);
    try {
      const user = await register({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });
      toast.success('Акаунт створено ✓', `Вітаємо, ${user.name.split(' ')[0]}!`);
      navigate('/account', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({ ...error.fieldErrors, form: error.details ? '' : error.message });
      } else {
        setErrors({ form: 'Щось пішло не так. Спробуйте ще раз.' });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell
      title="Створити акаунт"
      subtitle="Займе менше хвилини."
      footer={
        <>
          Уже маєте акаунт?{' '}
          <Link to="/login" className="font-bold text-ink underline underline-offset-2">
            Увійти
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
          label="Ім’я та прізвище"
          required
          autoComplete="name"
          placeholder="Андрій Шевченко"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
        />
        <Input
          label="Email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
        />
        <Input
          label="Телефон"
          type="tel"
          autoComplete="tel"
          placeholder="+380 XX XXX XX XX"
          hint="Потрібен менеджеру для підтвердження замовлення"
          value={form.phone}
          onChange={set('phone')}
          error={errors.phone}
        />
        <Input
          label="Пароль"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Мінімум 8 символів"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
        />

        <Button type="submit" size="lg" fullWidth loading={pending}>
          Зареєструватися
        </Button>
      </form>

      <ul className="mt-6 space-y-2">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-center gap-2 text-[13px] text-ink-muted">
            <Check className="size-4 shrink-0 text-lime-dark" aria-hidden />
            {benefit}
          </li>
        ))}
      </ul>
    </AuthShell>
  );
}
