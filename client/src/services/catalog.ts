import { api, toQuery } from './api';
import type {
  Brand,
  Category,
  FilterMeta,
  Goal,
  HomePayload,
  Paginated,
  Product,
  Review,
  SearchPayload,
} from '@/types';

export type CatalogFilters = {
  q?: string;
  category?: string[];
  brand?: string[];
  goal?: string[];
  weight?: string[];
  flavor?: string[];
  form?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  minDiscount?: number;
  inStock?: boolean;
  onSale?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
};

export const catalogApi = {
  home: () => api.get<HomePayload>('/catalog/home'),

  products: (filters: CatalogFilters, signal?: AbortSignal) =>
    api.get<Paginated<Product>>(`/catalog/products${toQuery(filters)}`, signal),

  product: (slug: string) =>
    api.get<{ item: Product; reviews: Review[]; related: Product[] }>(
      `/catalog/products/${encodeURIComponent(slug)}`,
    ),

  search: (q: string, signal?: AbortSignal) =>
    api.get<SearchPayload>(`/catalog/search${toQuery({ q })}`, signal),

  categories: () => api.get<{ items: Category[] }>('/catalog/categories'),

  category: (slug: string) =>
    api.get<{ item: Category }>(`/catalog/categories/${encodeURIComponent(slug)}`),

  brands: () => api.get<{ items: Brand[] }>('/catalog/brands'),

  goals: () => api.get<{ items: Goal[] }>('/catalog/goals'),

  filters: () => api.get<FilterMeta>('/catalog/filters'),
};
