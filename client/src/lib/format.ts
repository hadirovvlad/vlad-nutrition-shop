const PRICE = new Intl.NumberFormat('uk-UA', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 1234.5 → "1 234,5 ₴" */
export function formatPrice(value: number): string {
  return `${PRICE.format(value)} ₴`;
}

/** Price without the currency sign, for form inputs and tables. */
export function formatAmount(value: number): string {
  return PRICE.format(value);
}

const DATE = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const DATE_TIME = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(value: string | Date): string {
  return DATE.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return DATE_TIME.format(new Date(value));
}

/**
 * Formats a bare "YYYY-MM-DD" key. `new Date("2026-09-12")` is parsed as UTC
 * midnight, which renders as the previous day west of Greenwich, so the parts
 * are turned into a local date instead.
 */
export function formatDateKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return DATE.format(new Date(year, (month ?? 1) - 1, day ?? 1));
}

/** "2 товари" / "5 товарів" — Ukrainian plural rules. */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function productsLabel(count: number): string {
  return `${count} ${plural(count, 'товар', 'товари', 'товарів')}`;
}

export function reviewsLabel(count: number): string {
  return `${count} ${plural(count, 'відгук', 'відгуки', 'відгуків')}`;
}

/** Digits-only phone for tel: links. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
