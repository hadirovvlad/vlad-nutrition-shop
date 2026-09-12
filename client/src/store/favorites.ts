import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { accountApi } from '@/services';

type FavoritesState = {
  ids: number[];
  has: (productId: number) => boolean;
  /** Optimistic toggle; persists to the server when the visitor is signed in. */
  toggle: (productId: number, isAuthenticated: boolean) => Promise<boolean>;
  /** On login: keep guest picks and merge the server's list into them. */
  sync: (serverIds: number[]) => Promise<void>;
  reset: () => void;
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],

      has: (productId) => get().ids.includes(productId),

      toggle: async (productId, isAuthenticated) => {
        const active = get().ids.includes(productId);
        const next = active
          ? get().ids.filter((id) => id !== productId)
          : [...get().ids, productId];
        set({ ids: next });

        if (isAuthenticated) {
          try {
            if (active) await accountApi.removeFavorite(productId);
            else await accountApi.addFavorite(productId);
          } catch {
            set({ ids: get().ids }); // keep the optimistic state; a reload re-syncs
          }
        }

        return !active;
      },

      sync: async (serverIds) => {
        const local = get().ids;

        // Push anything the guest collected before signing in. Ids for products
        // that no longer exist simply fail and are dropped.
        const missing = local.filter((id) => !serverIds.includes(id));
        if (missing.length) {
          await Promise.all(
            missing.map((id) => accountApi.addFavorite(id).catch(() => undefined)),
          );
        }

        // Re-read so the store holds exactly what the server accepted. Without
        // this, stale ids left in localStorage keep inflating the header badge.
        const confirmed = await accountApi.favorites().catch(() => null);
        set({ ids: confirmed ? confirmed.ids : serverIds });
      },

      reset: () => set({ ids: [] }),
    }),
    { name: 'vlad-favorites', version: 1 },
  ),
);

export const selectFavoritesCount = (state: FavoritesState) => state.ids.length;
