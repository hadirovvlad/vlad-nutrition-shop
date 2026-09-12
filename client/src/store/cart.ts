import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, Product } from '@/types';

/** One cart line per product + chosen weight + chosen flavour. */
function lineKey(productId: number, weight?: string | null, flavor?: string | null) {
  return `${productId}|${weight ?? ''}|${flavor ?? ''}`;
}

type CartState = {
  lines: CartLine[];
  add: (
    product: Product,
    options?: { quantity?: number; weight?: string | null; flavor?: string | null },
  ) => void;
  setQuantity: (key: string, quantity: number) => void;
  increment: (key: string) => void;
  decrement: (key: string) => void;
  remove: (key: string) => void;
  clear: () => void;
};

export const cartKey = lineKey;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],

      add: (product, options) => {
        const quantity = Math.max(1, options?.quantity ?? 1);
        const weight = options?.weight ?? product.weights[0] ?? product.weight ?? null;
        const flavor = options?.flavor ?? product.flavors[0] ?? product.flavor ?? null;
        const key = lineKey(product.id, weight, flavor);

        const lines = [...get().lines];
        const index = lines.findIndex(
          (line) => lineKey(line.productId, line.weight, line.flavor) === key,
        );

        if (index >= 0) {
          const existing = lines[index];
          lines[index] = {
            ...existing,
            // Never let the cart exceed what the warehouse holds.
            quantity: Math.min(existing.stock, existing.quantity + quantity),
            price: product.price,
            oldPrice: product.oldPrice,
            stock: product.stock,
          };
        } else {
          lines.push({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            brand: product.brand?.name ?? null,
            image: product.image,
            price: product.price,
            oldPrice: product.oldPrice,
            quantity: Math.min(product.stock, quantity),
            weight,
            flavor,
            stock: product.stock,
            categorySlug: product.category?.slug ?? null,
          });
        }

        set({ lines });
      },

      setQuantity: (key, quantity) =>
        set({
          lines: get().lines.map((line) =>
            lineKey(line.productId, line.weight, line.flavor) === key
              ? { ...line, quantity: Math.max(1, Math.min(line.stock, quantity)) }
              : line,
          ),
        }),

      increment: (key) => {
        const line = get().lines.find((l) => lineKey(l.productId, l.weight, l.flavor) === key);
        if (line) get().setQuantity(key, line.quantity + 1);
      },

      decrement: (key) => {
        const line = get().lines.find((l) => lineKey(l.productId, l.weight, l.flavor) === key);
        if (line) get().setQuantity(key, line.quantity - 1);
      },

      remove: (key) =>
        set({
          lines: get().lines.filter(
            (line) => lineKey(line.productId, line.weight, line.flavor) !== key,
          ),
        }),

      clear: () => set({ lines: [] }),
    }),
    { name: 'vlad-cart', version: 1 },
  ),
);

/* -------------------------------- selectors ------------------------------- */

export const selectCartCount = (state: CartState) =>
  state.lines.reduce((sum, line) => sum + line.quantity, 0);

export const selectCartSubtotal = (state: CartState) =>
  Math.round(state.lines.reduce((sum, line) => sum + line.price * line.quantity, 0) * 100) / 100;

export const selectCartSavings = (state: CartState) =>
  Math.round(
    state.lines.reduce(
      (sum, line) => sum + (line.oldPrice ? (line.oldPrice - line.price) * line.quantity : 0),
      0,
    ) * 100,
  ) / 100;
