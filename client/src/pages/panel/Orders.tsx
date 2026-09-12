import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, Mail, MessageSquarePlus, Pencil, Phone, Search } from 'lucide-react';
import {
  DELIVERY_LABEL,
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  PAYMENT_LABEL,
} from '@/lib/constants';
import { formatDate, formatDateTime, formatPrice, telHref } from '@/lib/format';
import { useDebounced, useDocumentMeta } from '@/hooks';
import { ApiError, mgmtApi } from '@/services';
import { toast } from '@/store/toast';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { ProductImage } from '@/components/product/ProductVisual';
import { PanelHeader } from '@/layouts/PanelLayout';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Cell, DataTable, Pagination, Row, Tabs } from '@/components/ui/data';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/overlay';
import type { DeliveryMethod, OrderStatus, PaymentMethod } from '@/types';

/* --------------------------------- listing -------------------------------- */

export function PanelOrdersPage({ base }: { base: string }) {
  useDocumentMeta('Замовлення — панель');

  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const status = (params.get('status') ?? 'ALL') as OrderStatus | 'ALL';
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const debouncedSearch = useDebounced(search, 350);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['mgmt', 'orders', status, debouncedSearch, page],
    queryFn: () =>
      mgmtApi.orders({
        status: status === 'ALL' ? undefined : status,
        q: debouncedSearch || undefined,
        page,
        limit: 20,
      }),
    placeholderData: (previous) => previous,
  });

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  return (
    <div>
      <PanelHeader
        title="Замовлення"
        description="Обробляйте замовлення та змінюйте їхні статуси."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setParam('q', event.target.value || null);
            }}
            placeholder="Номер, телефон, email, прізвище"
            aria-label="Пошук замовлень"
            className="h-11 w-full rounded-xl border border-line bg-surface pr-3 pl-10 text-sm outline-none focus:border-ink"
          />
        </div>
      </div>

      <Tabs
        tabs={[
          { value: 'ALL', label: 'Усі', count: data?.total },
          ...ORDER_STATUSES.map((value) => ({
            value,
            label: ORDER_STATUS_LABEL[value],
            count: data?.counts?.[value],
          })),
        ]}
        active={status}
        onChange={(next) => setParam('status', next === 'ALL' ? null : next)}
        className="mb-4"
      />

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : data!.items.length === 0 ? (
        <EmptyState
          title="Замовлень не знайдено"
          description={
            debouncedSearch
              ? 'Спробуйте інший запит.'
              : 'У цьому статусі поки немає замовлень.'
          }
        />
      ) : (
        <>
          <DataTable
            head={['№', 'Дата', 'Клієнт', 'Телефон', 'Сума', 'Статус', 'Менеджер', 'Дії']}
          >
            {data!.items.map((order) => (
              <Row key={order.id}>
                <Cell className="font-bold text-ink">№{order.number}</Cell>
                <Cell className="whitespace-nowrap">{formatDate(order.createdAt)}</Cell>
                <Cell>
                  <span className="font-semibold text-ink">
                    {order.firstName} {order.lastName}
                  </span>
                  <span className="block text-xs text-ink-faint">{order.email}</span>
                </Cell>
                <Cell>
                  <a
                    href={telHref(order.phone)}
                    className="font-medium whitespace-nowrap text-ink hover:underline"
                  >
                    {order.phone}
                  </a>
                </Cell>
                <Cell className="font-bold whitespace-nowrap text-ink tabular-nums">
                  {formatPrice(order.total)}
                </Cell>
                <Cell>
                  <OrderStatusBadge status={order.status} />
                </Cell>
                <Cell className="whitespace-nowrap">
                  {order.manager?.name ?? <span className="text-ink-faint">—</span>}
                </Cell>
                <Cell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`${base}/orders/${order.id}`)}
                  >
                    <Eye className="size-3.5" aria-hidden />
                    Переглянути
                  </Button>
                </Cell>
              </Row>
            ))}
          </DataTable>

          <Pagination
            page={data!.page}
            pages={data!.pages}
            onChange={(next) => setParam('page', String(next))}
            className="mt-6"
          />
        </>
      )}
    </div>
  );
}

/* --------------------------------- details -------------------------------- */

export function PanelOrderDetailPage({ base }: { base: string }) {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [note, setNote] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('');
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['mgmt', 'order', id],
    queryFn: () => mgmtApi.order(Number(id)),
    enabled: Boolean(id),
    retry: false,
  });

  useDocumentMeta(data ? `Замовлення №${data.item.number} — панель` : 'Замовлення — панель');

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['mgmt', 'order', id] });
    void queryClient.invalidateQueries({ queryKey: ['mgmt', 'orders'] });
    void queryClient.invalidateQueries({ queryKey: ['mgmt', 'stats'] });
  };

  const statusMutation = useMutation({
    mutationFn: () =>
      mgmtApi.setOrderStatus(Number(id), {
        status: nextStatus as OrderStatus,
        note: statusNote || undefined,
      }),
    onSuccess: (result) => {
      toast.success(`Статус змінено: ${ORDER_STATUS_LABEL[result.item.status]}`);
      setNextStatus('');
      setStatusNote('');
      invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Не вдалося змінити статус');
    },
  });

  const noteMutation = useMutation({
    mutationFn: () => mgmtApi.addOrderNote(Number(id), note),
    onSuccess: () => {
      toast.success('Коментар додано');
      setNote('');
      invalidate();
    },
  });

  if (isLoading) return <TableSkeleton rows={6} cols={4} />;
  if (isError || !data) {
    return (
      <ErrorState
        title="Замовлення не знайдено"
        onRetry={() => void refetch()}
      />
    );
  }

  const order = data.item;

  return (
    <div>
      <Link
        to={`${base}/orders`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        До списку замовлень
      </Link>

      <PanelHeader
        title={`Замовлення №${order.number}`}
        description={`Створено ${formatDateTime(order.createdAt)}`}
        actions={
          <>
            <OrderStatusBadge status={order.status} className="self-center" />
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" aria-hidden />
              Редагувати дані
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {/* Items */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-4 text-base font-extrabold text-ink">Склад замовлення</h2>
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="size-12 shrink-0 overflow-hidden rounded-lg border border-line bg-ground">
                    <ProductImage
                      src={item.image}
                      name={item.name}
                      slug={item.slug ?? String(item.id)}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    {item.slug ? (
                      <Link
                        to={`/product/${item.slug}`}
                        className="line-clamp-2-safe text-[13px] font-bold text-ink hover:underline"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <span className="text-[13px] font-bold text-ink">{item.name}</span>
                    )}
                    <span className="block text-[11px] text-ink-muted">
                      {[item.weight, item.flavor].filter(Boolean).join(' · ')}
                      {item.weight || item.flavor ? ' · ' : ''}
                      {formatPrice(item.price)} × {item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] font-extrabold text-ink tabular-nums">
                    {formatPrice(item.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="font-extrabold text-ink">Разом</span>
              <span className="text-xl font-black text-ink tabular-nums">
                {formatPrice(order.total)}
              </span>
            </div>
          </section>

          {/* Internal notes */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-extrabold text-ink">Внутрішні коментарі</h2>
            <p className="mt-1 text-[13px] text-ink-muted">
              Видно лише персоналу. Клієнт цих записів не бачить.
            </p>

            {order.notes.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {order.notes.map((entry) => (
                  <li key={entry.id} className="rounded-xl bg-ground p-3.5">
                    <p className="text-[13px] text-ink-soft">{entry.text}</p>
                    <p className="mt-1.5 text-[11px] text-ink-faint">
                      {entry.author?.name ?? 'Система'} · {formatDateTime(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[13px] text-ink-faint">Коментарів ще немає.</p>
            )}

            <div className="mt-4">
              <Textarea
                placeholder="Наприклад: клієнт просив передзвонити після 18:00"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <Button
                className="mt-2"
                disabled={!note.trim()}
                loading={noteMutation.isPending}
                onClick={() => noteMutation.mutate()}
              >
                <MessageSquarePlus className="size-4" aria-hidden />
                Додати коментар
              </Button>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          {/* Status control */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-extrabold text-ink">Змінити статус</h2>
            <Select
              className="mt-3"
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
            >
              <option value="">Вибрати новий статус…</option>
              {ORDER_STATUSES.filter((value) => value !== order.status).map((value) => (
                <option key={value} value={value}>
                  {ORDER_STATUS_LABEL[value]}
                </option>
              ))}
            </Select>

            {nextStatus === 'CANCELLED' ? (
              <p className="mt-2 rounded-xl bg-warn-soft px-3 py-2 text-[12px] text-warn">
                Скасування поверне товари на склад.
              </p>
            ) : null}

            <Textarea
              className="mt-3"
              placeholder="Коментар до зміни статусу (необов’язково)"
              value={statusNote}
              onChange={(event) => setStatusNote(event.target.value)}
            />

            <Button
              fullWidth
              className="mt-3"
              disabled={!nextStatus}
              loading={statusMutation.isPending}
              onClick={() => statusMutation.mutate()}
            >
              Застосувати
            </Button>
          </section>

          {/* Customer */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-extrabold text-ink">Клієнт</h2>
            <p className="mt-3 text-sm font-bold text-ink">
              {order.firstName} {order.lastName}
            </p>

            <div className="mt-3 space-y-2">
              <a
                href={telHref(order.phone)}
                className="flex items-center gap-2 text-[13px] font-semibold text-ink hover:underline"
              >
                <Phone className="size-4 shrink-0 text-ink-muted" aria-hidden />
                {order.phone}
              </a>
              <a
                href={`mailto:${order.email}`}
                className="flex items-center gap-2 text-[13px] text-ink-soft hover:underline"
              >
                <Mail className="size-4 shrink-0 text-ink-muted" aria-hidden />
                <span className="truncate">{order.email}</span>
              </a>
            </div>

            {order.customer ? (
              <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[13px]">
                <InfoRow label="Акаунт" value="Зареєстрований" />
                <InfoRow
                  label="Клієнт з"
                  value={formatDate(order.customer.createdAt)}
                />
                {data.customerOrderCount !== null ? (
                  <InfoRow label="Усього замовлень" value={String(data.customerOrderCount)} />
                ) : null}
                <div className="pt-1">
                  <Link
                    to={`${base}/customers/${order.customer.id}`}
                    className="text-[13px] font-bold text-ink hover:underline"
                  >
                    Картка клієнта →
                  </Link>
                </div>
              </dl>
            ) : (
              <p className="mt-4 rounded-xl bg-ground p-3 text-[12px] text-ink-muted">
                Замовлення оформлено без реєстрації.
              </p>
            )}
          </section>

          {/* Delivery / payment */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-extrabold text-ink">Доставка та оплата</h2>
            <dl className="mt-3 space-y-2 text-[13px]">
              <InfoRow label="Доставка" value={DELIVERY_LABEL[order.deliveryMethod]} />
              {order.city ? <InfoRow label="Місто" value={order.city} /> : null}
              {order.warehouse ? <InfoRow label="Відділення" value={order.warehouse} /> : null}
              <InfoRow label="Оплата" value={PAYMENT_LABEL[order.paymentMethod]} />
              <InfoRow label="Менеджер" value={order.manager?.name ?? 'Не призначений'} />
            </dl>
            {order.comment ? (
              <p className="mt-3 rounded-xl bg-ground p-3 text-[12px] text-ink-soft">
                <span className="font-semibold text-ink">Коментар клієнта: </span>
                {order.comment}
              </p>
            ) : null}
          </section>
        </aside>
      </div>

      <EditOrderModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        order={order}
        onSaved={invalidate}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}

/* ------------------------------- edit modal ------------------------------- */

function EditOrderModal({
  open,
  onClose,
  order,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  order: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    deliveryMethod: DeliveryMethod;
    paymentMethod: PaymentMethod;
    city: string | null;
    warehouse: string | null;
    comment: string | null;
  };
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    firstName: order.firstName,
    lastName: order.lastName,
    phone: order.phone,
    email: order.email,
    deliveryMethod: order.deliveryMethod,
    paymentMethod: order.paymentMethod,
    city: order.city ?? '',
    warehouse: order.warehouse ?? '',
    comment: order.comment ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => mgmtApi.updateOrder(order.id, form),
    onSuccess: () => {
      toast.success('Дані замовлення оновлено ✓');
      onSaved();
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError) setErrors(error.fieldErrors);
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Редагувати дані замовлення"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Скасувати
          </Button>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Зберегти
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Ім’я"
          value={form.firstName}
          onChange={(event) => setForm({ ...form, firstName: event.target.value })}
          error={errors.firstName}
        />
        <Input
          label="Прізвище"
          value={form.lastName}
          onChange={(event) => setForm({ ...form, lastName: event.target.value })}
          error={errors.lastName}
        />
        <Input
          label="Телефон"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          error={errors.phone}
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          error={errors.email}
        />
        <Select
          label="Доставка"
          value={form.deliveryMethod}
          onChange={(event) =>
            setForm({ ...form, deliveryMethod: event.target.value as DeliveryMethod })
          }
        >
          {Object.entries(DELIVERY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          label="Оплата"
          value={form.paymentMethod}
          onChange={(event) =>
            setForm({ ...form, paymentMethod: event.target.value as PaymentMethod })
          }
        >
          {Object.entries(PAYMENT_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input
          label="Місто"
          value={form.city}
          onChange={(event) => setForm({ ...form, city: event.target.value })}
          error={errors.city}
        />
        <Input
          label="Відділення"
          value={form.warehouse}
          onChange={(event) => setForm({ ...form, warehouse: event.target.value })}
          error={errors.warehouse}
        />
        <Textarea
          label="Коментар"
          wrapperClassName="sm:col-span-2"
          value={form.comment}
          onChange={(event) => setForm({ ...form, comment: event.target.value })}
          error={errors.comment}
        />
      </div>
    </Modal>
  );
}
