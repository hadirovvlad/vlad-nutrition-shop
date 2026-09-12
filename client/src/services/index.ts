import { api, toQuery } from './api';
import type {
  Address,
  Brand,
  Category,
  DashboardStats,
  DeliveryMethod,
  Order,
  OrderNote,
  OrderStatus,
  Paginated,
  PaymentMethod,
  Product,
  Review,
  User,
} from '@/types';

export { api, toQuery, ApiError } from './api';
export { catalogApi } from './catalog';
export type { CatalogFilters } from './catalog';

/* ---------------------------------- auth ---------------------------------- */

export const authApi = {
  me: () => api.get<{ user: User | null }>('/auth/me'),
  login: (body: { email: string; password: string }) =>
    api.post<{ user: User }>('/auth/login', body),
  register: (body: { name: string; email: string; phone?: string; password: string }) =>
    api.post<{ user: User }>('/auth/register', body),
  logout: () => api.post<{ ok: true }>('/auth/logout'),
  forgotPassword: (body: { email: string }) =>
    api.post<{ message: string; devToken?: string }>('/auth/forgot-password', body),
  resetPassword: (body: { token: string; password: string }) =>
    api.post<{ message: string }>('/auth/reset-password', body),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api.post<{ message: string }>('/auth/change-password', body),
};

/* --------------------------------- account -------------------------------- */

export const accountApi = {
  updateProfile: (body: { name: string; email: string; phone?: string }) =>
    api.put<{ user: User }>('/account/profile', body),

  addresses: () => api.get<{ items: Address[] }>('/account/addresses'),
  createAddress: (body: Omit<Address, 'id'>) =>
    api.post<{ item: Address }>('/account/addresses', body),
  updateAddress: (id: number, body: Omit<Address, 'id'>) =>
    api.put<{ item: Address }>(`/account/addresses/${id}`, body),
  deleteAddress: (id: number) => api.del<{ ok: true }>(`/account/addresses/${id}`),

  favorites: () => api.get<{ items: Product[]; ids: number[] }>('/account/favorites'),
  addFavorite: (productId: number) =>
    api.post<{ ok: true; productId: number }>(`/account/favorites/${productId}`),
  removeFavorite: (productId: number) =>
    api.del<{ ok: true; productId: number }>(`/account/favorites/${productId}`),

  orders: () => api.get<{ items: Order[] }>('/account/orders'),
  order: (id: number) => api.get<{ item: Order }>(`/account/orders/${id}`),
};

/* --------------------------------- orders --------------------------------- */

export type CheckoutPayload = {
  items: { productId: number; quantity: number; weight?: string; flavor?: string }[];
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  city?: string;
  warehouse?: string;
  comment?: string;
};

export const ordersApi = {
  create: (body: CheckoutPayload) => api.post<{ item: Order }>('/orders', body),
  confirmation: (number: number) =>
    api.get<{
      item: {
        number: number;
        status: OrderStatus;
        total: number;
        deliveryMethod: DeliveryMethod;
        paymentMethod: PaymentMethod;
        createdAt: string;
        itemCount: number;
      };
    }>(`/orders/confirmation/${number}`),
};

/* --------------------------------- reviews -------------------------------- */

export const reviewsApi = {
  create: (body: { productId: number; rating: number; text: string }) =>
    api.post<{ item: Review }>('/reviews', body),
  mine: () => api.get<{ items: Review[] }>('/reviews/mine'),
};

/* ------------------------- management (admin/manager) --------------------- */

export type ProductPayload = {
  name: string;
  slug?: string;
  description: string;
  composition: string;
  usage: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  brandId: number;
  categoryId: number;
  weight?: string;
  flavor?: string;
  form?: string;
  weights: string[];
  flavors: string[];
  goals: string[];
  image?: string;
  images: string[];
  specs: { label: string; value: string }[];
  isNew: boolean;
  isBestseller: boolean;
  isFeatured: boolean;
  isActive: boolean;
  seoTitle?: string;
  seoDescription?: string;
};

export const mgmtApi = {
  whoami: () => api.get<{ role: string; id: number; name: string }>('/mgmt/whoami'),
  stats: () => api.get<DashboardStats>('/mgmt/stats'),

  orders: (params: { status?: string; q?: string; page?: number; limit?: number }) =>
    api.get<Paginated<Order> & { counts: Record<OrderStatus, number> }>(
      `/mgmt/orders${toQuery(params)}`,
    ),
  order: (id: number) =>
    api.get<{ item: Order; customerOrderCount: number | null }>(`/mgmt/orders/${id}`),
  setOrderStatus: (id: number, body: { status: OrderStatus; note?: string }) =>
    api.patch<{ item: Order }>(`/mgmt/orders/${id}/status`, body),
  updateOrder: (
    id: number,
    body: {
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
      deliveryMethod: DeliveryMethod;
      paymentMethod: PaymentMethod;
      city?: string;
      warehouse?: string;
      comment?: string;
    },
  ) => api.put<{ item: Order }>(`/mgmt/orders/${id}`, body),
  addOrderNote: (id: number, text: string) =>
    api.post<{ item: OrderNote }>(`/mgmt/orders/${id}/notes`, { text }),

  products: (params: {
    q?: string;
    categoryId?: number;
    brandId?: number;
    lowStock?: boolean;
    onSale?: boolean;
    sort?: string;
    page?: number;
    limit?: number;
  }) => api.get<Paginated<Product>>(`/mgmt/products${toQuery(params)}`),
  product: (id: number) => api.get<{ item: Product }>(`/mgmt/products/${id}`),
  createProduct: (body: ProductPayload) => api.post<{ item: Product }>('/mgmt/products', body),
  updateProduct: (id: number, body: ProductPayload) =>
    api.put<{ item: Product }>(`/mgmt/products/${id}`, body),
  patchProduct: (
    id: number,
    body: { price?: number; oldPrice?: number | null; stock?: number; isActive?: boolean },
  ) => api.patch<{ item: Product }>(`/mgmt/products/${id}/inline`, body),
  deleteProduct: (id: number) =>
    api.del<{ ok?: true; item?: Product; archived: boolean; message: string }>(
      `/mgmt/products/${id}`,
    ),
  requestProductDelete: (id: number) =>
    api.post<{ item: Product; message: string }>(`/mgmt/products/${id}/request-delete`),
  rejectProductDelete: (id: number) =>
    api.post<{ item: Product }>(`/mgmt/products/${id}/reject-delete`),
  deleteRequests: () => api.get<{ items: Product[] }>('/mgmt/products/delete-requests'),
  bulkDiscount: (body: {
    percent: number;
    productIds?: number[];
    categoryId?: number;
    brandId?: number;
  }) => api.post<{ updated: number; message: string }>('/mgmt/products/bulk-discount', body),

  categories: () => api.get<{ items: Category[] }>('/mgmt/categories'),
  createCategory: (body: {
    name: string;
    slug?: string;
    icon?: string;
    image?: string;
    parentId?: number | null;
    sortOrder: number;
  }) => api.post<{ item: Category }>('/mgmt/categories', body),
  updateCategory: (
    id: number,
    body: {
      name: string;
      slug?: string;
      icon?: string;
      image?: string;
      parentId?: number | null;
      sortOrder: number;
    },
  ) => api.put<{ item: Category }>(`/mgmt/categories/${id}`, body),
  deleteCategory: (id: number) => api.del<{ ok: true }>(`/mgmt/categories/${id}`),

  brands: () => api.get<{ items: Brand[] }>('/mgmt/brands'),
  createBrand: (body: { name: string; slug?: string; logo?: string; country?: string }) =>
    api.post<{ item: Brand }>('/mgmt/brands', body),
  updateBrand: (
    id: number,
    body: { name: string; slug?: string; logo?: string; country?: string },
  ) => api.put<{ item: Brand }>(`/mgmt/brands/${id}`, body),
  deleteBrand: (id: number) => api.del<{ ok: true }>(`/mgmt/brands/${id}`),

  users: (params: { role?: string; q?: string; page?: number; limit?: number }) =>
    api.get<Paginated<User>>(`/mgmt/users${toQuery(params)}`),
  user: (id: number) =>
    api.get<{
      item: User;
      orders: Order[];
      addresses: { id: number; label: string; city: string; warehouse: string }[];
      stats: { orderCount: number; spent: number };
    }>(`/mgmt/users/${id}`),
  createUser: (body: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: string;
  }) => api.post<{ item: User }>('/mgmt/users', body),
  updateUser: (
    id: number,
    body: {
      name: string;
      email: string;
      phone?: string;
      role: string;
      isActive: boolean;
      password?: string;
    },
  ) => api.put<{ item: User }>(`/mgmt/users/${id}`, body),
  deleteUser: (id: number) =>
    api.del<{ ok?: true; deactivated: boolean; message: string }>(`/mgmt/users/${id}`),

  reviews: (status: 'all' | 'approved' | 'pending' = 'all') =>
    api.get<{ items: Review[] }>(`/mgmt/reviews${toQuery({ status })}`),
  setReviewApproval: (id: number, isApproved: boolean) =>
    api.patch<{ item: Review }>(`/mgmt/reviews/${id}`, { isApproved }),
  deleteReview: (id: number) => api.del<{ ok: true }>(`/mgmt/reviews/${id}`),

  settings: () => api.get<{ items: Record<string, string> }>('/mgmt/settings'),
  updateSettings: (body: Record<string, string>) =>
    api.put<{ items: Record<string, string>; message: string }>('/mgmt/settings', body),
};
