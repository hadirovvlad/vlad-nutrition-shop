import type { DeliveryMethod, OrderStatus, PaymentMethod, Role } from '@/types';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: 'Нове',
  CONFIRMING: 'Підтвердження',
  PROCESSING: 'В обробці',
  SHIPPED: 'Передано в доставку',
  COMPLETED: 'Виконано',
  CANCELLED: 'Скасовано',
};

/** Badge palette per status — kept in one place so panels and the account agree. */
export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  NEW: 'bg-info-soft text-info',
  CONFIRMING: 'bg-warn-soft text-warn',
  PROCESSING: 'bg-warn-soft text-warn',
  SHIPPED: 'bg-lime-soft text-ink',
  COMPLETED: 'bg-ok-soft text-ok',
  CANCELLED: 'bg-danger-soft text-danger',
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'NEW',
  'CONFIRMING',
  'PROCESSING',
  'SHIPPED',
  'COMPLETED',
];

export const ORDER_STATUSES: OrderStatus[] = [...ORDER_STATUS_FLOW, 'CANCELLED'];

export const DELIVERY_LABEL: Record<DeliveryMethod, string> = {
  NOVA_POSHTA: 'Нова Пошта',
  PICKUP: 'Самовивіз',
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  COD: 'Післяплата',
  ONLINE: 'Онлайн-оплата',
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Адміністратор',
  MANAGER: 'Менеджер',
  CLIENT: 'Клієнт',
};

export const SORT_OPTIONS = [
  { value: 'popular', label: 'За популярністю' },
  { value: 'new', label: 'За новизною' },
  { value: 'price-asc', label: 'Від дешевих' },
  { value: 'price-desc', label: 'Від дорогих' },
  { value: 'rating', label: 'За рейтингом' },
  { value: 'discount', label: 'За розміром знижки' },
] as const;

export const PRODUCT_FORMS = [
  'Порошок',
  'Капсули',
  'Таблетки',
  'Рідина',
  'Батончик',
  'Аксесуар',
] as const;

/** Discount buckets shown as filter chips on the deals page. */
export const DISCOUNT_STEPS = [10, 20, 30, 40] as const;

/**
 * Store identity. `useDocumentMeta` appends SHOP_NAME to every page title, so
 * renaming the shop is a change in this one place.
 */
export const SHOP_NAME = 'VLAD NUTRITION';
/** Short form for tight spots: product names, chips, the logo mark. */
export const SHOP_SHORT_NAME = 'VLAD';
export const SHOP_DOMAIN = 'vladnutrition.ua';

export const PICKUP_ADDRESS = 'вул. Спортивна 1, Київ (щодня 10:00–20:00)';

export const SUPPORT_PHONE = '+380 44 123 45 67';
export const SUPPORT_EMAIL = `support@${SHOP_DOMAIN}`;
export const FREE_DELIVERY_FROM = 1500;

/** Panel home routes per role — used after login and by route guards. */
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/admin',
  MANAGER: '/manager',
  CLIENT: '/account',
};
