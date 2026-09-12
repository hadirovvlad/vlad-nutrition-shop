/**
 * Enum-like values. SQLite has no native enums, so these live here and are
 * enforced by zod on every write path.
 */

export const ROLES = ['ADMIN', 'MANAGER', 'CLIENT'] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUSES = [
  'NEW',
  'CONFIRMING',
  'PROCESSING',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Нове',
  CONFIRMING: 'Підтвердження',
  PROCESSING: 'В обробці',
  SHIPPED: 'Передано в доставку',
  COMPLETED: 'Виконано',
  CANCELLED: 'Скасовано',
};

export const DELIVERY_METHODS = ['NOVA_POSHTA', 'PICKUP'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const PAYMENT_METHODS = ['COD', 'ONLINE'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PRODUCT_FORMS = [
  'Порошок',
  'Капсули',
  'Таблетки',
  'Рідина',
  'Батончик',
  'Аксесуар',
] as const;

/** "За цілями" block — slugs kept stable because they appear in URLs. */
export const GOALS = [
  { slug: 'mass', name: 'Набір м’язової маси' },
  { slug: 'cutting', name: 'Сушка' },
  { slug: 'recovery', name: 'Відновлення' },
  { slug: 'strength', name: 'Сила та витривалість' },
  { slug: 'health', name: 'Здоров’я' },
  { slug: 'energy', name: 'Енергія' },
] as const;

export const SHOP_NAME = 'VLAD NUTRITION';
export const SHOP_DOMAIN = 'vladnutrition.ua';

export const AUTH_COOKIE = 'vlad_token';

/** Free delivery threshold in UAH, used by the checkout summary. */
export const FREE_DELIVERY_FROM = 1500;
export const DELIVERY_FEE = 80;
