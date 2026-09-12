import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mail, Pencil, Phone, Plus, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { ROLE_LABEL } from '@/lib/constants';
import { formatDate, formatPrice, telHref } from '@/lib/format';
import { useDebounced, useDocumentMeta } from '@/hooks';
import { ApiError, mgmtApi } from '@/services';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { PanelHeader } from '@/layouts/PanelLayout';
import { Button } from '@/components/ui/Button';
import { Input, Select, Switch } from '@/components/ui/Field';
import { Cell, DataTable, Pagination, Row, StatTile } from '@/components/ui/data';
import { Badge, EmptyState, ErrorState, TableSkeleton } from '@/components/ui/feedback';
import { ConfirmDialog, Modal } from '@/components/ui/overlay';
import type { Role, User } from '@/types';

/* -------------------------------- customers ------------------------------- */

export function PanelCustomersPage({ base }: { base: string }) {
  useDocumentMeta('Клієнти — панель');

  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const debouncedSearch = useDebounced(search, 350);
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['mgmt', 'users', 'CLIENT', debouncedSearch, page],
    queryFn: () =>
      mgmtApi.users({ role: 'CLIENT', q: debouncedSearch || undefined, page, limit: 20 }),
    placeholderData: (previous) => previous,
  });

  return (
    <div>
      <PanelHeader title="Клієнти" description="Зареєстровані покупці магазину." />

      <div className="relative mb-4 w-full sm:max-w-xs">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            const next = new URLSearchParams(params);
            if (event.target.value) next.set('q', event.target.value);
            else next.delete('q');
            next.delete('page');
            setParams(next);
          }}
          placeholder="Ім’я, email або телефон"
          aria-label="Пошук клієнтів"
          className="h-11 w-full rounded-xl border border-line bg-surface pr-3 pl-10 text-sm outline-none focus:border-ink"
        />
      </div>

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : data!.items.length === 0 ? (
        <EmptyState title="Клієнтів не знайдено" />
      ) : (
        <>
          <DataTable head={["Ім'я", 'Email', 'Телефон', 'Замовлень', 'Реєстрація', 'Дії']}>
            {data!.items.map((customer) => (
              <Row key={customer.id}>
                <Cell>
                  <span className="font-bold text-ink">{customer.name}</span>
                  {!customer.isActive ? (
                    <Badge tone="muted" className="ml-2">
                      Неактивний
                    </Badge>
                  ) : null}
                </Cell>
                <Cell>
                  <a href={`mailto:${customer.email}`} className="hover:underline">
                    {customer.email}
                  </a>
                </Cell>
                <Cell>
                  {customer.phone ? (
                    <a
                      href={telHref(customer.phone)}
                      className="font-medium whitespace-nowrap text-ink hover:underline"
                    >
                      {customer.phone}
                    </a>
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </Cell>
                <Cell className="tabular-nums">{customer.orderCount ?? 0}</Cell>
                <Cell className="whitespace-nowrap">{formatDate(customer.createdAt)}</Cell>
                <Cell>
                  <Link
                    to={`${base}/customers/${customer.id}`}
                    className="inline-flex h-9 items-center rounded-xl border border-line-strong px-3 text-[13px] font-semibold text-ink transition-colors hover:border-ink"
                  >
                    Картка
                  </Link>
                </Cell>
              </Row>
            ))}
          </DataTable>

          <Pagination
            page={data!.page}
            pages={data!.pages}
            onChange={(next) => {
              const updated = new URLSearchParams(params);
              updated.set('page', String(next));
              setParams(updated);
            }}
            className="mt-6"
          />
        </>
      )}
    </div>
  );
}

/* ----------------------------- customer details --------------------------- */

export function PanelCustomerDetailPage({ base }: { base: string }) {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['mgmt', 'user', id],
    queryFn: () => mgmtApi.user(Number(id)),
    enabled: Boolean(id),
    retry: false,
  });

  useDocumentMeta(data ? `${data.item.name} — панель` : 'Клієнт — панель');

  if (isLoading) return <TableSkeleton rows={5} cols={4} />;
  if (isError || !data) {
    return <ErrorState title="Клієнта не знайдено" onRetry={() => void refetch()} />;
  }

  const { item: customer, orders, addresses, stats } = data;

  return (
    <div>
      <Link
        to={`${base}/customers`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        До списку клієнтів
      </Link>

      <PanelHeader
        title={customer.name}
        description={`${ROLE_LABEL[customer.role]} · з ${formatDate(customer.createdAt)}`}
      />

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile label="Замовлень" value={stats.orderCount} />
        <StatTile label="Сума покупок" value={formatPrice(stats.spent)} tone="accent" />
        <StatTile
          label="Середній чек"
          value={stats.orderCount ? formatPrice(stats.spent / stats.orderCount) : '—'}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-4 text-base font-extrabold text-ink">Історія замовлень</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-ink-muted">Замовлень ще не було.</p>
          ) : (
            <ul className="divide-y divide-line">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    to={`${base}/orders/${order.id}`}
                    className="-mx-2 flex flex-wrap items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-ground"
                  >
                    <span className="text-sm font-bold text-ink">№{order.number}</span>
                    <OrderStatusBadge status={order.status} />
                    <span className="text-[13px] text-ink-muted">
                      {formatDate(order.createdAt)}
                    </span>
                    <span className="ml-auto text-sm font-bold text-ink tabular-nums">
                      {formatPrice(order.total)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-extrabold text-ink">Контакти</h2>
            <div className="mt-3 space-y-2">
              {customer.phone ? (
                <a
                  href={telHref(customer.phone)}
                  className="flex items-center gap-2 text-[13px] font-semibold text-ink hover:underline"
                >
                  <Phone className="size-4 shrink-0 text-ink-muted" aria-hidden />
                  {customer.phone}
                </a>
              ) : null}
              <a
                href={`mailto:${customer.email}`}
                className="flex items-center gap-2 text-[13px] text-ink-soft hover:underline"
              >
                <Mail className="size-4 shrink-0 text-ink-muted" aria-hidden />
                <span className="truncate">{customer.email}</span>
              </a>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-extrabold text-ink">Адреси доставки</h2>
            {addresses.length === 0 ? (
              <p className="mt-3 text-[13px] text-ink-muted">Адрес не збережено.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {addresses.map((address) => (
                  <li key={address.id} className="rounded-xl bg-ground p-3">
                    <p className="text-[13px] font-bold text-ink">{address.label}</p>
                    <p className="text-[12px] text-ink-soft">
                      {address.city}, {address.warehouse}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

/* --------------------------------- managers ------------------------------- */

type StaffForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  isActive: boolean;
};

const BLANK_STAFF: StaffForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'MANAGER',
  isActive: true,
};

export function PanelManagersPage() {
  useDocumentMeta('Менеджери — панель');

  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [form, setForm] = useState<StaffForm>(BLANK_STAFF);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['mgmt', 'staff'],
    queryFn: async () => {
      const [managers, admins] = await Promise.all([
        mgmtApi.users({ role: 'MANAGER', limit: 100 }),
        mgmtApi.users({ role: 'ADMIN', limit: 100 }),
      ]);
      return [...admins.items, ...managers.items];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['mgmt', 'staff'] });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? mgmtApi.updateUser(editing.id, {
            name: form.name,
            email: form.email,
            phone: form.phone || undefined,
            role: form.role,
            isActive: form.isActive,
            password: form.password || undefined,
          })
        : mgmtApi.createUser({
            name: form.name,
            email: form.email,
            phone: form.phone || undefined,
            password: form.password,
            role: form.role,
          }),
    onSuccess: () => {
      toast.success(editing ? 'Дані співробітника оновлено ✓' : 'Співробітника створено ✓');
      close();
      void invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        if (!error.details) toast.error(error.message);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mgmtApi.deleteUser(id),
    onSuccess: (result) => {
      toast.success(result.message);
      setDeleting(null);
      void invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Не вдалося видалити');
      setDeleting(null);
    },
  });

  const open = (staff?: User) => {
    setErrors({});
    if (staff) {
      setEditing(staff);
      setForm({
        name: staff.name,
        email: staff.email,
        phone: staff.phone ?? '',
        password: '',
        role: staff.role,
        isActive: staff.isActive,
      });
    } else {
      setEditing(null);
      setCreating(true);
      setForm(BLANK_STAFF);
    }
  };

  const close = () => {
    setEditing(null);
    setCreating(false);
    setErrors({});
  };

  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const staff = data ?? [];

  return (
    <div>
      <PanelHeader
        title="Менеджери та адміністратори"
        description="Створюйте менеджерів і призначайте їм доступ. Адміністраторів видалити не можна."
        actions={
          <Button onClick={() => open()}>
            <Plus className="size-4" aria-hidden />
            Створити менеджера
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-info-soft bg-info-soft/40 p-4">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        <div className="text-[13px] text-ink-soft">
          <p className="font-semibold text-ink">Права менеджера</p>
          <p className="mt-1">
            Замовлення, статуси, клієнти, склад, акції, ціна й наявність товарів. Менеджер не
            створює інших менеджерів, не змінює системні налаштування й не видаляє товари без
            дозволу адміністратора.
          </p>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : (
        <DataTable head={["Ім'я", 'Email', 'Телефон', 'Роль', 'Статус', 'Дії']}>
          {staff.map((person) => (
            <Row key={person.id}>
              <Cell>
                <span className="font-bold text-ink">{person.name}</span>
                {person.id === currentUser?.id ? (
                  <span className="ml-2 text-[11px] text-ink-faint">(це ви)</span>
                ) : null}
              </Cell>
              <Cell>{person.email}</Cell>
              <Cell>{person.phone ?? <span className="text-ink-faint">—</span>}</Cell>
              <Cell>
                <Badge tone={person.role === 'ADMIN' ? 'ink' : 'lime'}>
                  {ROLE_LABEL[person.role]}
                </Badge>
              </Cell>
              <Cell>
                {person.isActive ? (
                  <Badge tone="ok">Активний</Badge>
                ) : (
                  <Badge tone="muted">Вимкнений</Badge>
                )}
              </Cell>
              <Cell>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => open(person)}>
                    <Pencil className="size-3.5" aria-hidden />
                    Змінити
                  </Button>
                  <button
                    type="button"
                    disabled={person.role === 'ADMIN'}
                    onClick={() => setDeleting(person)}
                    aria-label="Видалити співробітника"
                    title={
                      person.role === 'ADMIN'
                        ? 'Адміністраторів видалити не можна'
                        : 'Видалити'
                    }
                    className="flex size-9 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-faint"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </Cell>
            </Row>
          ))}
        </DataTable>
      )}

      <Modal
        open={creating || Boolean(editing)}
        onClose={close}
        title={editing ? 'Змінити співробітника' : 'Новий співробітник'}
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
            label="Ім’я та прізвище"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            error={errors.name}
          />
          <Input
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            error={errors.email}
          />
          <Input
            label="Телефон"
            type="tel"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            error={errors.phone}
          />
          <Input
            label={editing ? 'Новий пароль' : 'Пароль'}
            type="password"
            required={!editing}
            hint={editing ? 'Залиште порожнім, щоб не змінювати' : 'Мінімум 8 символів'}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            error={errors.password}
          />
          <Select
            label="Роль"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
            error={errors.role}
          >
            <option value="MANAGER">Менеджер</option>
            <option value="ADMIN">Адміністратор</option>
            <option value="CLIENT">Клієнт</option>
          </Select>

          {editing ? (
            <Switch
              label="Акаунт активний"
              checked={form.isActive}
              onChange={(value) => setForm({ ...form, isActive: value })}
            />
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Видалити співробітника?"
        description={`«${deleting?.name}» втратить доступ до панелі. Якщо на ньому є замовлення, акаунт буде деактивовано, а не видалено.`}
        confirmLabel="Видалити"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
