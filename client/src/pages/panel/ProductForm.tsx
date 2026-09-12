import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ImagePlus, Plus, Trash2, Upload } from 'lucide-react';
import { PRODUCT_FORMS } from '@/lib/constants';
import { formatPrice } from '@/lib/format';
import { useDocumentMeta } from '@/hooks';
import { api, ApiError, mgmtApi, type ProductPayload } from '@/services';
import { toast } from '@/store/toast';
import { ProductVisual } from '@/components/product/ProductVisual';
import { PanelHeader } from '@/layouts/PanelLayout';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Select, Switch, Textarea } from '@/components/ui/Field';
import { PageLoader } from '@/components/ui/feedback';

const GOALS = [
  { slug: 'mass', name: 'Набір м’язової маси' },
  { slug: 'cutting', name: 'Сушка' },
  { slug: 'recovery', name: 'Відновлення' },
  { slug: 'strength', name: 'Сила та витривалість' },
  { slug: 'health', name: 'Здоров’я' },
  { slug: 'energy', name: 'Енергія' },
];

type FormState = ProductPayload & { oldPriceText: string; priceText: string };

const BLANK: FormState = {
  name: '',
  slug: '',
  description: '',
  composition: '',
  usage: '',
  price: 0,
  priceText: '',
  oldPrice: null,
  oldPriceText: '',
  stock: 0,
  brandId: 0,
  categoryId: 0,
  weight: '',
  flavor: '',
  form: '',
  weights: [],
  flavors: [],
  goals: [],
  image: '',
  images: [],
  specs: [],
  isNew: false,
  isBestseller: false,
  isFeatured: false,
  isActive: true,
  seoTitle: '',
  seoDescription: '',
};

export function PanelProductFormPage({ base }: { base: string }) {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const productId = isNew ? null : Number(id);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  useDocumentMeta(isNew ? 'Новий товар — панель' : 'Редагування товару — панель');

  const { data: taxonomy, isLoading: taxonomyLoading } = useQuery({
    queryKey: ['mgmt', 'taxonomy'],
    queryFn: async () => {
      const [categories, brands] = await Promise.all([mgmtApi.categories(), mgmtApi.brands()]);
      return { categories: categories.items, brands: brands.items };
    },
  });

  const { data: existing, isLoading: productLoading } = useQuery({
    queryKey: ['mgmt', 'product', productId],
    queryFn: () => mgmtApi.product(productId!),
    enabled: productId !== null,
  });

  // Load the product into the form once.
  useEffect(() => {
    if (!existing) return;
    const product = existing.item;
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description,
      composition: product.composition,
      usage: product.usage,
      price: product.price,
      priceText: String(product.price),
      oldPrice: product.oldPrice,
      oldPriceText: product.oldPrice ? String(product.oldPrice) : '',
      stock: product.stock,
      brandId: product.brandId,
      categoryId: product.categoryId,
      weight: product.weight ?? '',
      flavor: product.flavor ?? '',
      form: product.form ?? '',
      weights: product.weights,
      flavors: product.flavors,
      goals: product.goals.map((goal) => goal.slug),
      image: product.image ?? '',
      images: product.images,
      specs: product.specs,
      isNew: product.isNew,
      isBestseller: product.isBestseller,
      isFeatured: product.isFeatured,
      isActive: product.isActive,
      seoTitle: product.seoTitle ?? '',
      seoDescription: product.seoDescription ?? '',
    });
  }, [existing]);

  // Pick sensible defaults for a brand-new product.
  useEffect(() => {
    if (!isNew || !taxonomy) return;
    setForm((previous) =>
      previous.brandId || previous.categoryId
        ? previous
        : {
            ...previous,
            brandId: taxonomy.brands[0]?.id ?? 0,
            categoryId: taxonomy.categories[0]?.id ?? 0,
          },
    );
  }, [isNew, taxonomy]);

  const payload = useMemo<ProductPayload>(() => {
    const price = Number(form.priceText.replace(',', '.')) || 0;
    const oldPrice =
      form.oldPriceText.trim() === '' ? null : Number(form.oldPriceText.replace(',', '.')) || null;

    return {
      name: form.name,
      slug: form.slug || undefined,
      description: form.description,
      composition: form.composition,
      usage: form.usage,
      price,
      oldPrice,
      stock: form.stock,
      brandId: form.brandId,
      categoryId: form.categoryId,
      weight: form.weight || undefined,
      flavor: form.flavor || form.flavors[0] || undefined,
      form: form.form || undefined,
      weights: form.weights,
      flavors: form.flavors,
      goals: form.goals,
      image: form.image || undefined,
      images: form.images,
      specs: form.specs,
      isNew: form.isNew,
      isBestseller: form.isBestseller,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
      seoTitle: form.seoTitle || undefined,
      seoDescription: form.seoDescription || undefined,
    };
  }, [form]);

  const mutation = useMutation({
    mutationFn: () =>
      productId === null
        ? mgmtApi.createProduct(payload)
        : mgmtApi.updateProduct(productId, payload),
    onSuccess: (result) => {
      toast.success(productId === null ? 'Товар створено ✓' : 'Товар оновлено ✓', result.item.name);
      void queryClient.invalidateQueries({ queryKey: ['mgmt', 'products'] });
      void queryClient.invalidateQueries({ queryKey: ['mgmt', 'stats'] });
      navigate(`${base}/products`);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        toast.error(error.message);
      }
    },
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const result = await api.upload(Array.from(files));
      setForm((previous) => ({
        ...previous,
        images: [...previous.images, ...result.urls].slice(0, 10),
        image: previous.image || result.urls[0],
      }));
      toast.success('Зображення завантажено ✓');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не вдалося завантажити файли');
    } finally {
      setUploading(false);
    }
  };

  if (taxonomyLoading || productLoading) return <PageLoader />;

  const discount =
    payload.oldPrice && payload.oldPrice > payload.price
      ? Math.round(((payload.oldPrice - payload.price) / payload.oldPrice) * 100)
      : 0;

  return (
    <div>
      <Link
        to={`${base}/products`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        До списку товарів
      </Link>

      <PanelHeader
        title={productId === null ? 'Новий товар' : `Редагування: ${existing?.item.name ?? ''}`}
        description="Обов’язкові поля позначені зірочкою."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(`${base}/products`)}>
              Скасувати
            </Button>
            <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
              {productId === null ? 'Створити товар' : 'Зберегти зміни'}
            </Button>
          </>
        }
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setErrors({});
          mutation.mutate();
        }}
        className="grid gap-4 lg:grid-cols-[1fr_320px]"
      >
        <div className="space-y-4">
          {/* Basics */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-4 text-base font-extrabold text-ink">Основна інформація</h2>
            <div className="grid gap-4">
              <Input
                label="Назва товару"
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                error={errors.name}
              />
              <Input
                label="URL (slug)"
                hint="Залиште порожнім — згенеруємо з назви"
                value={form.slug ?? ''}
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
                error={errors.slug}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Категорія"
                  required
                  value={form.categoryId || ''}
                  onChange={(event) => setForm({ ...form, categoryId: Number(event.target.value) })}
                  error={errors.categoryId}
                >
                  <option value="">Вибрати…</option>
                  {(taxonomy?.categories ?? []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.parentId ? '— ' : ''}
                      {category.name}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Бренд"
                  required
                  value={form.brandId || ''}
                  onChange={(event) => setForm({ ...form, brandId: Number(event.target.value) })}
                  error={errors.brandId}
                >
                  <option value="">Вибрати…</option>
                  {(taxonomy?.brands ?? []).map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </Select>
              </div>

              <Textarea
                label="Опис"
                className="min-h-32"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                error={errors.description}
              />
            </div>
          </section>

          {/* Price & stock */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-4 text-base font-extrabold text-ink">Ціна та наявність</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Ціна, ₴"
                required
                inputMode="decimal"
                value={form.priceText}
                onChange={(event) => setForm({ ...form, priceText: event.target.value })}
                error={errors.price}
              />
              <Input
                label="Стара ціна, ₴"
                inputMode="decimal"
                hint="Для розрахунку знижки"
                value={form.oldPriceText}
                onChange={(event) => setForm({ ...form, oldPriceText: event.target.value })}
                error={errors.oldPrice}
              />
              <Input
                label="Кількість на складі"
                type="number"
                min={0}
                value={form.stock}
                onChange={(event) => setForm({ ...form, stock: Number(event.target.value) })}
                error={errors.stock}
              />
            </div>

            {discount > 0 ? (
              <p className="mt-3 rounded-xl bg-lime-soft px-3.5 py-2.5 text-[13px] font-semibold text-ink">
                Знижка −{discount}% ({formatPrice(payload.oldPrice! - payload.price)} економії)
              </p>
            ) : form.oldPriceText.trim() !== '' ? (
              <p className="mt-3 rounded-xl bg-warn-soft px-3.5 py-2.5 text-[13px] text-warn">
                Стара ціна має бути вищою за поточну, інакше вона буде скинута.
              </p>
            ) : null}
          </section>

          {/* Options */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-4 text-base font-extrabold text-ink">Варіанти та характеристики</h2>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Основна вага / об’єм"
                  placeholder="900 г"
                  value={form.weight ?? ''}
                  onChange={(event) => setForm({ ...form, weight: event.target.value })}
                  error={errors.weight}
                />
                <Select
                  label="Форма випуску"
                  value={form.form ?? ''}
                  onChange={(event) => setForm({ ...form, form: event.target.value })}
                  error={errors.form}
                >
                  <option value="">Не вказано</option>
                  {PRODUCT_FORMS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </div>

              <TagEditor
                label="Доступні ваги"
                placeholder="Напр. 900 г"
                values={form.weights}
                onChange={(weights) => setForm({ ...form, weights })}
              />
              <TagEditor
                label="Доступні смаки"
                placeholder="Напр. Шоколад"
                values={form.flavors}
                onChange={(flavors) => setForm({ ...form, flavors })}
              />

              <div>
                <p className="mb-2 text-[13px] font-semibold text-ink">Цілі</p>
                <div className="grid gap-0.5 sm:grid-cols-2">
                  {GOALS.map((goal) => (
                    <Checkbox
                      key={goal.slug}
                      label={goal.name}
                      checked={form.goals.includes(goal.slug)}
                      onChange={() =>
                        setForm({
                          ...form,
                          goals: form.goals.includes(goal.slug)
                            ? form.goals.filter((slug) => slug !== goal.slug)
                            : [...form.goals, goal.slug],
                        })
                      }
                    />
                  ))}
                </div>
              </div>

              <SpecEditor
                values={form.specs}
                onChange={(specs) => setForm({ ...form, specs })}
              />
            </div>
          </section>

          {/* Long text */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-4 text-base font-extrabold text-ink">Склад і застосування</h2>
            <div className="grid gap-4">
              <Textarea
                label="Склад"
                value={form.composition}
                onChange={(event) => setForm({ ...form, composition: event.target.value })}
                error={errors.composition}
              />
              <Textarea
                label="Спосіб застосування"
                value={form.usage}
                onChange={(event) => setForm({ ...form, usage: event.target.value })}
                error={errors.usage}
              />
            </div>
          </section>

          {/* SEO */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-1 text-base font-extrabold text-ink">SEO</h2>
            <p className="mb-4 text-[13px] text-ink-muted">
              Якщо залишити порожнім, буде використано назву та початок опису.
            </p>
            <div className="grid gap-4">
              <Input
                label="Title"
                value={form.seoTitle ?? ''}
                onChange={(event) => setForm({ ...form, seoTitle: event.target.value })}
                error={errors.seoTitle}
              />
              <Textarea
                label="Description"
                value={form.seoDescription ?? ''}
                onChange={(event) => setForm({ ...form, seoDescription: event.target.value })}
                error={errors.seoDescription}
              />
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-base font-extrabold text-ink">Зображення</h2>

            <div className="overflow-hidden rounded-xl border border-line bg-ground">
              <div className="aspect-square w-full">
                {form.images[0] || form.image ? (
                  <img
                    src={form.images[0] ?? form.image}
                    alt=""
                    className="h-full w-full object-contain p-4"
                  />
                ) : (
                  <ProductVisual
                    name={form.name || 'Новий товар'}
                    slug={form.slug || form.name || 'new'}
                    form={form.form ?? null}
                  />
                )}
              </div>
            </div>

            {!form.images.length && !form.image ? (
              <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
                Без фото товар отримує згенероване зображення на основі категорії та назви.
              </p>
            ) : null}

            <label className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong text-[13px] font-semibold text-ink transition-colors hover:border-ink hover:bg-ground">
              {uploading ? (
                <>
                  <Upload className="size-4 animate-pulse" aria-hidden />
                  Завантаження…
                </>
              ) : (
                <>
                  <ImagePlus className="size-4" aria-hidden />
                  Завантажити фото
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => void handleUpload(event.target.files)}
              />
            </label>

            <Input
              wrapperClassName="mt-3"
              label="Або вставте URL"
              placeholder="https://…"
              value={form.image ?? ''}
              onChange={(event) => setForm({ ...form, image: event.target.value })}
            />

            {form.images.length > 0 ? (
              <ul className="mt-3 grid grid-cols-4 gap-2">
                {form.images.map((image, index) => (
                  <li key={`${image}-${index}`} className="relative">
                    <span className="block aspect-square overflow-hidden rounded-lg border border-line bg-ground">
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          images: form.images.filter((_, position) => position !== index),
                        })
                      }
                      aria-label="Видалити зображення"
                      className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-white"
                    >
                      <Trash2 className="size-3" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-4 text-base font-extrabold text-ink">Позначки</h2>
            <div className="space-y-3.5">
              <Switch
                label="Новинка"
                checked={form.isNew}
                onChange={(value) => setForm({ ...form, isNew: value })}
              />
              <Switch
                label="Хіт продажів"
                checked={form.isBestseller}
                onChange={(value) => setForm({ ...form, isBestseller: value })}
              />
              <Switch
                label="Рекомендований"
                checked={form.isFeatured}
                onChange={(value) => setForm({ ...form, isFeatured: value })}
              />
              <div className="border-t border-line pt-3.5">
                <Switch
                  label="Показувати в каталозі"
                  checked={form.isActive}
                  onChange={(value) => setForm({ ...form, isActive: value })}
                />
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
              Позначка «Акція» встановлюється автоматично, коли стара ціна вища за поточну.
            </p>
          </section>
        </aside>
      </form>
    </div>
  );
}

/* ------------------------------- tag editor ------------------------------- */

function TagEditor({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const value = draft.trim();
    if (!value || values.includes(value)) {
      setDraft('');
      return;
    }
    onChange([...values, value]);
    setDraft('');
  };

  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-ink">{label}</p>
      <div className="flex gap-2">
        <input
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
          className="h-11 flex-1 rounded-xl border border-line bg-surface px-3.5 text-sm outline-none focus:border-ink"
        />
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="size-4" aria-hidden />
          Додати
        </Button>
      </div>

      {values.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <li key={value}>
              <button
                type="button"
                onClick={() => onChange(values.filter((entry) => entry !== value))}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink/5 py-1.5 pr-2 pl-3 text-[13px] font-medium text-ink transition-colors hover:bg-danger-soft hover:text-danger"
              >
                {value}
                <Trash2 className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SpecEditor({
  values,
  onChange,
}: {
  values: { label: string; value: string }[];
  onChange: (next: { label: string; value: string }[]) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-ink">Характеристики</p>

      {values.length > 0 ? (
        <ul className="mb-2 space-y-2">
          {values.map((spec, index) => (
            <li key={index} className="flex gap-2">
              <input
                value={spec.label}
                placeholder="Назва"
                onChange={(event) => {
                  const next = [...values];
                  next[index] = { ...spec, label: event.target.value };
                  onChange(next);
                }}
                className="h-11 flex-1 rounded-xl border border-line bg-surface px-3.5 text-sm outline-none focus:border-ink"
              />
              <input
                value={spec.value}
                placeholder="Значення"
                onChange={(event) => {
                  const next = [...values];
                  next[index] = { ...spec, value: event.target.value };
                  onChange(next);
                }}
                className="h-11 flex-1 rounded-xl border border-line bg-surface px-3.5 text-sm outline-none focus:border-ink"
              />
              <button
                type="button"
                onClick={() => onChange(values.filter((_, position) => position !== index))}
                aria-label="Видалити характеристику"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...values, { label: '', value: '' }])}
      >
        <Plus className="size-3.5" aria-hidden />
        Додати характеристику
      </Button>
    </div>
  );
}
