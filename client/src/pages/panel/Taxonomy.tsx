import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { productsLabel } from '@/lib/format';
import { useDocumentMeta } from '@/hooks';
import { ApiError, mgmtApi } from '@/services';
import { toast } from '@/store/toast';
import { PanelHeader } from '@/layouts/PanelLayout';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Cell, DataTable, Row } from '@/components/ui/data';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/feedback';
import { ConfirmDialog, Modal } from '@/components/ui/overlay';
import type { Brand, Category } from '@/types';

/* ------------------------------- categories ------------------------------- */

type CategoryForm = {
  name: string;
  slug: string;
  icon: string;
  parentId: number | null;
  sortOrder: number;
};

const BLANK_CATEGORY: CategoryForm = {
  name: '',
  slug: '',
  icon: '',
  parentId: null,
  sortOrder: 0,
};

export function PanelCategoriesPage() {
  useDocumentMeta('Категорії — панель');

  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(BLANK_CATEGORY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['mgmt', 'categories'],
    queryFn: () => mgmtApi.categories(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['mgmt', 'categories'] });
    void queryClient.invalidateQueries({ queryKey: ['mgmt', 'taxonomy'] });
    void queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        slug: form.slug || undefined,
        icon: form.icon || undefined,
        parentId: form.parentId,
        sortOrder: form.sortOrder,
      };
      return editing
        ? mgmtApi.updateCategory(editing.id, payload)
        : mgmtApi.createCategory(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Категорію оновлено ✓' : 'Категорію створено ✓');
      close();
      invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        if (!error.details) toast.error(error.message);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mgmtApi.deleteCategory(id),
    onSuccess: () => {
      toast.success('Категорію видалено');
      setDeleting(null);
      invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Не вдалося видалити');
      setDeleting(null);
    },
  });

  const open = (category?: Category) => {
    setErrors({});
    if (category) {
      setEditing(category);
      setForm({
        name: category.name,
        slug: category.slug,
        icon: category.icon ?? '',
        parentId: category.parentId,
        sortOrder: category.sortOrder,
      });
    } else {
      setEditing(null);
      setCreating(true);
      setForm(BLANK_CATEGORY);
    }
  };

  const close = () => {
    setEditing(null);
    setCreating(false);
    setErrors({});
  };

  const all = data?.items ?? [];
  const roots = all.filter((category) => !category.parentId);

  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div>
      <PanelHeader
        title="Категорії"
        description="Один рівень підкатегорій. Категорію з товарами видалити не можна."
        actions={
          <Button onClick={() => open()}>
            <Plus className="size-4" aria-hidden />
            Створити категорію
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : all.length === 0 ? (
        <EmptyState title="Категорій ще немає" action={<Button onClick={() => open()}>Створити</Button>} />
      ) : (
        // The API returns the tree already flattened in display order.
        <DataTable head={['', 'Назва', 'Slug', 'Товарів', 'Порядок', 'Дії']}>
          {all.map((category) => (
            <Row key={category.id}>
              <Cell className="w-10 text-lg">{category.icon}</Cell>
              <Cell>
                <span className="font-bold text-ink">
                  {category.parentId ? <span className="text-ink-faint">— </span> : null}
                  {category.name}
                </span>
              </Cell>
              <Cell className="font-mono text-[12px]">{category.slug}</Cell>
              <Cell className="tabular-nums">{category.ownProductCount}</Cell>
              <Cell className="tabular-nums">{category.sortOrder}</Cell>
              <Cell>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => open(category)}>
                    <Pencil className="size-3.5" aria-hidden />
                    Змінити
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeleting(category)}
                    aria-label="Видалити категорію"
                    className="flex size-9 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
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
        title={editing ? 'Змінити категорію' : 'Нова категорія'}
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
            label="Назва"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            error={errors.name}
          />
          <Input
            label="Slug"
            hint="Залиште порожнім для автогенерації"
            value={form.slug}
            onChange={(event) => setForm({ ...form, slug: event.target.value })}
            error={errors.slug}
          />
          <Input
            label="Іконка (емодзі)"
            placeholder="🥤"
            maxLength={4}
            value={form.icon}
            onChange={(event) => setForm({ ...form, icon: event.target.value })}
            error={errors.icon}
          />
          <Select
            label="Батьківська категорія"
            value={form.parentId ?? ''}
            onChange={(event) =>
              setForm({ ...form, parentId: event.target.value ? Number(event.target.value) : null })
            }
            error={errors.parentId}
          >
            <option value="">Немає (основна категорія)</option>
            {roots
              .filter((root) => root.id !== editing?.id)
              .map((root) => (
                <option key={root.id} value={root.id}>
                  {root.name}
                </option>
              ))}
          </Select>
          <Input
            label="Порядок сортування"
            type="number"
            min={0}
            value={form.sortOrder}
            onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })}
            error={errors.sortOrder}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Видалити категорію?"
        description={
          deleting?.ownProductCount
            ? `У категорії «${deleting.name}» ${productsLabel(deleting.ownProductCount)}. Спочатку перенесіть їх.`
            : `«${deleting?.name}» буде видалено.`
        }
        confirmLabel="Видалити"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

/* --------------------------------- brands --------------------------------- */

type BrandForm = { name: string; slug: string; country: string; logo: string };

const BLANK_BRAND: BrandForm = { name: '', slug: '', country: '', logo: '' };

export function PanelBrandsPage() {
  useDocumentMeta('Бренди — панель');

  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Brand | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Brand | null>(null);
  const [form, setForm] = useState<BrandForm>(BLANK_BRAND);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['mgmt', 'brands'],
    queryFn: () => mgmtApi.brands(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['mgmt', 'brands'] });
    void queryClient.invalidateQueries({ queryKey: ['mgmt', 'taxonomy'] });
    void queryClient.invalidateQueries({ queryKey: ['brands'] });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        slug: form.slug || undefined,
        country: form.country || undefined,
        logo: form.logo || undefined,
      };
      return editing ? mgmtApi.updateBrand(editing.id, payload) : mgmtApi.createBrand(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Бренд оновлено ✓' : 'Бренд створено ✓');
      close();
      invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        if (!error.details) toast.error(error.message);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mgmtApi.deleteBrand(id),
    onSuccess: () => {
      toast.success('Бренд видалено');
      setDeleting(null);
      invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Не вдалося видалити');
      setDeleting(null);
    },
  });

  const open = (brand?: Brand) => {
    setErrors({});
    if (brand) {
      setEditing(brand);
      setForm({
        name: brand.name,
        slug: brand.slug,
        country: brand.country ?? '',
        logo: brand.logo ?? '',
      });
    } else {
      setEditing(null);
      setCreating(true);
      setForm(BLANK_BRAND);
    }
  };

  const close = () => {
    setEditing(null);
    setCreating(false);
    setErrors({});
  };

  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const brands = data?.items ?? [];

  return (
    <div>
      <PanelHeader
        title="Бренди"
        description="Бренд із товарами видалити не можна."
        actions={
          <Button onClick={() => open()}>
            <Plus className="size-4" aria-hidden />
            Створити бренд
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : brands.length === 0 ? (
        <EmptyState title="Брендів ще немає" action={<Button onClick={() => open()}>Створити</Button>} />
      ) : (
        <DataTable head={['Назва', 'Slug', 'Країна', 'Товарів', 'Дії']}>
          {brands.map((brand) => (
            <Row key={brand.id}>
              <Cell className="font-bold text-ink">{brand.name}</Cell>
              <Cell className="font-mono text-[12px]">{brand.slug}</Cell>
              <Cell>{brand.country ?? <span className="text-ink-faint">—</span>}</Cell>
              <Cell className="tabular-nums">{brand.productCount}</Cell>
              <Cell>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => open(brand)}>
                    <Pencil className="size-3.5" aria-hidden />
                    Змінити
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeleting(brand)}
                    aria-label="Видалити бренд"
                    className="flex size-9 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
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
        title={editing ? 'Змінити бренд' : 'Новий бренд'}
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
            label="Назва"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            error={errors.name}
          />
          <Input
            label="Slug"
            hint="Залиште порожнім для автогенерації"
            value={form.slug}
            onChange={(event) => setForm({ ...form, slug: event.target.value })}
            error={errors.slug}
          />
          <Input
            label="Країна"
            value={form.country}
            onChange={(event) => setForm({ ...form, country: event.target.value })}
            error={errors.country}
          />
          <Input
            label="URL логотипа"
            placeholder="https://…"
            value={form.logo}
            onChange={(event) => setForm({ ...form, logo: event.target.value })}
            error={errors.logo}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Видалити бренд?"
        description={
          deleting?.productCount
            ? `У бренду «${deleting.name}» ${productsLabel(deleting.productCount)}. Спочатку перенесіть їх.`
            : `«${deleting?.name}» буде видалено.`
        }
        confirmLabel="Видалити"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
