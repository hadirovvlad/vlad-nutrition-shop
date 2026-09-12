import { useEffect, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatAmount } from '@/lib/format';
import { Checkbox } from '@/components/ui/Field';
import { Rating } from '@/components/ui/data';
import { Button } from '@/components/ui/Button';
import type { Brand, Category, FilterMeta, Goal } from '@/types';

export type FilterValue = {
  category: string[];
  brand: string[];
  goal: string[];
  weight: string[];
  flavor: string[];
  form: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock: boolean;
  onSale: boolean;
};

export const EMPTY_FILTERS: FilterValue = {
  category: [],
  brand: [],
  goal: [],
  weight: [],
  flavor: [],
  form: [],
  minPrice: undefined,
  maxPrice: undefined,
  minRating: undefined,
  inStock: false,
  onSale: false,
};

export function countActiveFilters(value: FilterValue): number {
  return (
    value.category.length +
    value.brand.length +
    value.goal.length +
    value.weight.length +
    value.flavor.length +
    value.form.length +
    (value.minPrice !== undefined || value.maxPrice !== undefined ? 1 : 0) +
    (value.minRating !== undefined ? 1 : 0) +
    (value.inStock ? 1 : 0) +
    (value.onSale ? 1 : 0)
  );
}

function Group({
  title,
  children,
  defaultOpen = true,
  count,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-line py-4 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-[13px] font-bold text-ink">
          {title}
          {count ? (
            <span className="rounded-full bg-ink px-1.5 py-0.5 text-[10px] leading-none text-white tabular-nums">
              {count}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-ink-muted transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open ? <div className="mt-3 space-y-0.5">{children}</div> : null}
    </section>
  );
}

/** A scrollable list, collapsed to the first few entries until expanded. */
function LimitedList({
  children,
  limit = 6,
  total,
}: {
  children: React.ReactNode[];
  limit?: number;
  total: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? children : children.slice(0, limit);

  return (
    <>
      <div className={cn(expanded && total > 12 && 'no-scrollbar max-h-72 overflow-y-auto')}>
        {visible}
      </div>
      {total > limit ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 text-xs font-bold text-ink underline-offset-2 hover:underline"
        >
          {expanded ? 'Показати менше' : `Ще ${total - limit}`}
        </button>
      ) : null}
    </>
  );
}

export function FilterSidebar({
  value,
  onChange,
  categories,
  brands,
  goals,
  meta,
  lockedCategory,
}: {
  value: FilterValue;
  onChange: (next: FilterValue) => void;
  categories: Category[];
  brands: Brand[];
  goals: Goal[];
  meta?: FilterMeta;
  /** When browsing /catalog/:slug the category is fixed and hidden from filters. */
  lockedCategory?: string;
}) {
  const [priceFrom, setPriceFrom] = useState(value.minPrice?.toString() ?? '');
  const [priceTo, setPriceTo] = useState(value.maxPrice?.toString() ?? '');

  useEffect(() => {
    setPriceFrom(value.minPrice?.toString() ?? '');
    setPriceTo(value.maxPrice?.toString() ?? '');
  }, [value.minPrice, value.maxPrice]);

  const toggle = (key: 'category' | 'brand' | 'goal' | 'weight' | 'flavor' | 'form', item: string) => {
    const current = value[key];
    onChange({
      ...value,
      [key]: current.includes(item)
        ? current.filter((entry) => entry !== item)
        : [...current, item],
    });
  };

  const applyPrice = () => {
    const from = priceFrom === '' ? undefined : Math.max(0, Number(priceFrom));
    const to = priceTo === '' ? undefined : Math.max(0, Number(priceTo));
    // Swap reversed bounds instead of returning nothing.
    const [min, max] =
      from !== undefined && to !== undefined && from > to ? [to, from] : [from, to];
    onChange({ ...value, minPrice: min, maxPrice: max });
  };

  const activeCount = countActiveFilters(value);
  const range = meta?.priceRange ?? { min: 0, max: 10000 };

  return (
    <div>
      {activeCount > 0 ? (
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-3">
          <span className="text-[13px] font-semibold text-ink-muted">
            Активних фільтрів: {activeCount}
          </span>
          <button
            type="button"
            onClick={() => onChange({ ...EMPTY_FILTERS })}
            className="flex items-center gap-1 text-xs font-bold text-danger hover:underline"
          >
            <X className="size-3.5" aria-hidden />
            Скинути
          </button>
        </div>
      ) : null}

      {!lockedCategory && categories.length > 0 ? (
        <Group title="Категорія" count={value.category.length}>
          <LimitedList total={categories.length} limit={8}>
            {categories.map((category) => (
              <Checkbox
                key={category.id}
                label={category.name}
                count={category.productCount}
                checked={value.category.includes(category.slug)}
                onChange={() => toggle('category', category.slug)}
              />
            ))}
          </LimitedList>
        </Group>
      ) : null}

      {brands.length > 0 ? (
        <Group title="Бренд" count={value.brand.length}>
          <LimitedList total={brands.length} limit={6}>
            {brands.map((brand) => (
              <Checkbox
                key={brand.id}
                label={brand.name}
                count={brand.productCount}
                checked={value.brand.includes(brand.slug)}
                onChange={() => toggle('brand', brand.slug)}
              />
            ))}
          </LimitedList>
        </Group>
      ) : null}

      <Group title="Ціна">
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={priceFrom}
            onChange={(event) => setPriceFrom(event.target.value)}
            onBlur={applyPrice}
            placeholder={formatAmount(range.min)}
            aria-label="Ціна від"
            className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm tabular-nums outline-none focus:border-ink"
          />
          <span className="text-ink-faint">—</span>
          <input
            type="number"
            inputMode="numeric"
            value={priceTo}
            onChange={(event) => setPriceTo(event.target.value)}
            onBlur={applyPrice}
            placeholder={formatAmount(range.max)}
            aria-label="Ціна до"
            className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm tabular-nums outline-none focus:border-ink"
          />
        </div>
        <Button variant="subtle" size="sm" className="mt-2 w-full" onClick={applyPrice}>
          Застосувати
        </Button>
      </Group>

      {meta?.weights.length ? (
        <Group title="Вага / об’єм" count={value.weight.length} defaultOpen={false}>
          <LimitedList total={meta.weights.length} limit={6}>
            {meta.weights.map((weight) => (
              <Checkbox
                key={weight}
                label={weight}
                checked={value.weight.includes(weight)}
                onChange={() => toggle('weight', weight)}
              />
            ))}
          </LimitedList>
        </Group>
      ) : null}

      {meta?.flavors.length ? (
        <Group title="Смак" count={value.flavor.length} defaultOpen={false}>
          <LimitedList total={meta.flavors.length} limit={6}>
            {meta.flavors.map((flavor) => (
              <Checkbox
                key={flavor}
                label={flavor}
                checked={value.flavor.includes(flavor)}
                onChange={() => toggle('flavor', flavor)}
              />
            ))}
          </LimitedList>
        </Group>
      ) : null}

      {meta?.forms.length ? (
        <Group title="Форма" count={value.form.length} defaultOpen={false}>
          {meta.forms.map((form) => (
            <Checkbox
              key={form}
              label={form}
              checked={value.form.includes(form)}
              onChange={() => toggle('form', form)}
            />
          ))}
        </Group>
      ) : null}

      {goals.length > 0 ? (
        <Group title="Ціль" count={value.goal.length} defaultOpen={false}>
          {goals.map((goal) => (
            <Checkbox
              key={goal.slug}
              label={goal.name}
              checked={value.goal.includes(goal.slug)}
              onChange={() => toggle('goal', goal.slug)}
            />
          ))}
        </Group>
      ) : null}

      <Group title="Рейтинг" defaultOpen={false}>
        {[4, 3].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() =>
              onChange({ ...value, minRating: value.minRating === rating ? undefined : rating })
            }
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-sm transition-colors',
              value.minRating === rating ? 'bg-ink/5 font-semibold text-ink' : 'text-ink-soft hover:bg-ground',
            )}
          >
            <Rating value={rating} size="sm" />
            <span className="text-xs">і вище</span>
          </button>
        ))}
      </Group>

      <Group title="Наявність та знижки">
        <Checkbox
          label="Тільки в наявності"
          checked={value.inStock}
          onChange={(event) => onChange({ ...value, inStock: event.target.checked })}
        />
        <Checkbox
          label="Тільки зі знижкою"
          checked={value.onSale}
          onChange={(event) => onChange({ ...value, onSale: event.target.checked })}
        />
      </Group>
    </div>
  );
}

/** Removable chips summarising what is currently filtered. */
export function ActiveFilterChips({
  value,
  onChange,
  categories,
  brands,
  goals,
}: {
  value: FilterValue;
  onChange: (next: FilterValue) => void;
  categories: Category[];
  brands: Brand[];
  goals: Goal[];
}) {
  const chips: { key: string; label: string; clear: () => void }[] = [];

  value.category.forEach((slug) => {
    const name = categories.find((category) => category.slug === slug)?.name ?? slug;
    chips.push({
      key: `c-${slug}`,
      label: name,
      clear: () => onChange({ ...value, category: value.category.filter((item) => item !== slug) }),
    });
  });

  value.brand.forEach((slug) => {
    const name = brands.find((brand) => brand.slug === slug)?.name ?? slug;
    chips.push({
      key: `b-${slug}`,
      label: name,
      clear: () => onChange({ ...value, brand: value.brand.filter((item) => item !== slug) }),
    });
  });

  value.goal.forEach((slug) => {
    const name = goals.find((goal) => goal.slug === slug)?.name ?? slug;
    chips.push({
      key: `g-${slug}`,
      label: name,
      clear: () => onChange({ ...value, goal: value.goal.filter((item) => item !== slug) }),
    });
  });

  (['weight', 'flavor', 'form'] as const).forEach((key) => {
    value[key].forEach((item) => {
      chips.push({
        key: `${key}-${item}`,
        label: item,
        clear: () => onChange({ ...value, [key]: value[key].filter((entry) => entry !== item) }),
      });
    });
  });

  if (value.minPrice !== undefined || value.maxPrice !== undefined) {
    chips.push({
      key: 'price',
      label: `${value.minPrice ?? 0} — ${value.maxPrice ?? '∞'} ₴`,
      clear: () => onChange({ ...value, minPrice: undefined, maxPrice: undefined }),
    });
  }
  if (value.minRating !== undefined) {
    chips.push({
      key: 'rating',
      label: `Рейтинг ${value.minRating}+`,
      clear: () => onChange({ ...value, minRating: undefined }),
    });
  }
  if (value.inStock) {
    chips.push({
      key: 'stock',
      label: 'В наявності',
      clear: () => onChange({ ...value, inStock: false }),
    });
  }
  if (value.onSale) {
    chips.push({
      key: 'sale',
      label: 'Зі знижкою',
      clear: () => onChange({ ...value, onSale: false }),
    });
  }

  if (!chips.length) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.clear}
          className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-1.5 pr-2 pl-3 text-[13px] font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          {chip.label}
          <X className="size-3.5 text-ink-faint group-hover:text-ink" aria-hidden />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...EMPTY_FILTERS })}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-bold text-danger hover:bg-danger-soft"
      >
        Скинути все
      </button>
    </div>
  );
}
