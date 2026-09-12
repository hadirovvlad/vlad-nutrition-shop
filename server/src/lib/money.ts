/** Prices are UAH floats; every write path rounds to 2 decimals. */
export function money(value: number): number {
  return Math.round(value * 100) / 100;
}

export function discountPercent(price: number, oldPrice?: number | null): number {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}
