import { parseStringList } from './json';
import { discountPercent, money } from './money';

/**
 * Fields that must stay in sync with the price and text of a product.
 * Computed here so create, update, bulk-discount and seed all agree.
 */
export function derivedProductFields(input: {
  name: string;
  price: number;
  oldPrice?: number | null;
  brandName?: string;
  categoryName?: string;
  flavors?: string | string[];
  description?: string;
}) {
  const price = money(input.price);
  const oldPrice =
    input.oldPrice === null || input.oldPrice === undefined ? null : money(input.oldPrice);
  const percent = discountPercent(price, oldPrice);

  const flavorList = Array.isArray(input.flavors)
    ? input.flavors
    : parseStringList(input.flavors);

  const haystack = [
    input.name,
    input.brandName ?? '',
    input.categoryName ?? '',
    flavorList.join(' '),
    (input.description ?? '').slice(0, 400),
  ]
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  return {
    price,
    // An oldPrice that is not above the current price represents no discount,
    // so it is dropped rather than kept as a stale anchor. This keeps
    // "raise the price, then apply -20%" discounting off the old value.
    oldPrice: percent > 0 ? oldPrice : null,
    discountPercent: percent,
    isSale: percent > 0,
    searchIndex: haystack,
  };
}
