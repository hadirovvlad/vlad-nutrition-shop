export type Role = 'ADMIN' | 'MANAGER' | 'CLIENT';

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMING'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED';

export type DeliveryMethod = 'NOVA_POSHTA' | 'PICKUP';
export type PaymentMethod = 'COD' | 'ONLINE';

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  orderCount?: number;
};

export type Brand = {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  country?: string | null;
  productCount?: number;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  icon: string | null;
  parentId: number | null;
  sortOrder: number;
  /** Products in this category plus its subcategories. */
  productCount: number;
  /** Products assigned directly to this category. */
  ownProductCount: number;
  children: Category[];
};

export type Goal = { slug: string; name: string };

export type Spec = { label: string; value: string };

export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string;
  composition: string;
  usage: string;
  price: number;
  oldPrice: number | null;
  discount: number;
  stock: number;
  inStock: boolean;
  weight: string | null;
  flavor: string | null;
  form: string | null;
  weights: string[];
  flavors: string[];
  goals: Goal[];
  image: string | null;
  images: string[];
  specs: Spec[];
  rating: number;
  reviewCount: number;
  soldCount: number;
  isNew: boolean;
  isBestseller: boolean;
  isSale: boolean;
  isFeatured: boolean;
  isActive: boolean;
  deleteRequested: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  brand: Brand | null;
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
  brandId: number;
  categoryId: number;
};

export type Review = {
  id: number;
  rating: number;
  text: string;
  isApproved: boolean;
  createdAt: string;
  author: { id: number; name: string } | null;
  product: { id: number; name: string; slug: string; image: string | null } | null;
};

export type Address = {
  id: number;
  label: string;
  city: string;
  warehouse: string;
  recipient: string | null;
  phone: string | null;
  isDefault: boolean;
};

export type OrderItem = {
  id: number;
  productId: number | null;
  name: string;
  slug: string | null;
  image: string | null;
  price: number;
  quantity: number;
  weight: string | null;
  flavor: string | null;
  lineTotal: number;
};

export type OrderNote = {
  id: number;
  text: string;
  createdAt: string;
  author: { id: number; name: string } | null;
};

export type Order = {
  id: number;
  number: number;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string | null;
  warehouse: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  userId: number | null;
  managerId: number | null;
  manager: { id: number; name: string } | null;
  customer: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    createdAt: string;
  } | null;
  items: OrderItem[];
  notes: OrderNote[];
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type FilterMeta = {
  weights: string[];
  flavors: string[];
  forms: string[];
  priceRange: { min: number; max: number };
};

export type HomePayload = {
  bestsellers: Product[];
  newArrivals: Product[];
  deals: Product[];
  categories: Category[];
  brands: Brand[];
  goals: Goal[];
  productCount: number;
};

export type SearchPayload = {
  products: {
    id: number;
    name: string;
    slug: string;
    image: string | null;
    price: number;
    oldPrice: number | null;
    brand: string | null;
  }[];
  categories: { id: number; name: string; slug: string }[];
  brands: { id: number; name: string; slug: string }[];
  total: number;
};

export type DashboardStats = {
  orderCount: number;
  byStatus: Record<OrderStatus, number>;
  revenue: number;
  averageOrder: number;
  clientCount: number;
  productCount: number;
  lowStockCount: number;
  lowStock: { id: number; name: string; slug: string; stock: number; image: string | null }[];
  topProducts: {
    id: number;
    name: string;
    slug: string;
    soldCount: number;
    price: number;
    image: string | null;
  }[];
  recentOrders: Order[];
  daily: { date: string; revenue: number; orders: number }[];
  lowStockThreshold: number;
};

export type CartLine = {
  productId: number;
  slug: string;
  name: string;
  brand: string | null;
  image: string | null;
  price: number;
  oldPrice: number | null;
  quantity: number;
  weight: string | null;
  flavor: string | null;
  stock: number;
  categorySlug: string | null;
};
