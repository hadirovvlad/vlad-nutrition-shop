import type { Address, Brand, Category, Order, OrderItem, OrderNote, Product, Review, User } from '@prisma/client';
import { parseSpecs, parseStringList } from './json';
import { discountPercent } from './money';
import { GOALS } from './constants';

const GOAL_NAME = new Map<string, string>(GOALS.map((goal) => [goal.slug, goal.name]));

type ProductWithRelations = Product & {
  brand?: Brand | null;
  category?: Category | null;
};

export function serializeProduct(product: ProductWithRelations) {
  const goals = parseStringList(product.goals);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    composition: product.composition,
    usage: product.usage,
    price: product.price,
    oldPrice: product.oldPrice,
    discount: discountPercent(product.price, product.oldPrice),
    stock: product.stock,
    inStock: product.stock > 0,
    weight: product.weight,
    flavor: product.flavor,
    form: product.form,
    weights: parseStringList(product.weights),
    flavors: parseStringList(product.flavors),
    goals: goals.map((slug) => ({ slug, name: GOAL_NAME.get(slug) ?? slug })),
    image: product.image,
    images: parseStringList(product.images),
    specs: parseSpecs(product.specs),
    rating: product.rating,
    reviewCount: product.reviewCount,
    soldCount: product.soldCount,
    isNew: product.isNew,
    isBestseller: product.isBestseller,
    isSale: product.isSale,
    isFeatured: product.isFeatured,
    isActive: product.isActive,
    deleteRequested: product.deleteRequested,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    createdAt: product.createdAt,
    brand: product.brand ? { id: product.brand.id, name: product.brand.name, slug: product.brand.slug, logo: product.brand.logo } : null,
    category: product.category
      ? { id: product.category.id, name: product.category.name, slug: product.category.slug }
      : null,
    brandId: product.brandId,
    categoryId: product.categoryId,
  };
}

export type SerializedProduct = ReturnType<typeof serializeProduct>;

type CategoryWithCounts = Category & {
  children?: CategoryWithCounts[];
  _count?: { products: number };
};

export function serializeCategory(category: CategoryWithCounts): Record<string, unknown> {
  const own = category._count?.products ?? 0;
  const children = category.children ?? [];
  // A parent shows everything beneath it: products sit on subcategories, so a
  // bare own-count would report "Протеїн — 1 товар" for a full section.
  const inChildren = children.reduce((sum, child) => sum + (child._count?.products ?? 0), 0);

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    image: category.image,
    icon: category.icon,
    parentId: category.parentId,
    sortOrder: category.sortOrder,
    productCount: own + inChildren,
    ownProductCount: own,
    children: children.map((child) => serializeCategory(child)),
  };
}

export function serializeBrand(brand: Brand & { _count?: { products: number } }) {
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logo: brand.logo,
    country: brand.country,
    productCount: brand._count?.products ?? 0,
  };
}

export function serializeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

export function serializeAddress(address: Address) {
  return {
    id: address.id,
    label: address.label,
    city: address.city,
    warehouse: address.warehouse,
    recipient: address.recipient,
    phone: address.phone,
    isDefault: address.isDefault,
  };
}

type OrderWithRelations = Order & {
  items?: OrderItem[];
  user?: Pick<User, 'id' | 'name' | 'email' | 'phone' | 'createdAt'> | null;
  manager?: Pick<User, 'id' | 'name'> | null;
  notes?: (OrderNote & { author?: Pick<User, 'id' | 'name'> | null })[];
};

export function serializeOrder(order: OrderWithRelations) {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    subtotal: order.subtotal,
    discount: order.discount,
    total: order.total,
    deliveryMethod: order.deliveryMethod,
    paymentMethod: order.paymentMethod,
    firstName: order.firstName,
    lastName: order.lastName,
    phone: order.phone,
    email: order.email,
    city: order.city,
    warehouse: order.warehouse,
    comment: order.comment,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    userId: order.userId,
    managerId: order.managerId,
    manager: order.manager ? { id: order.manager.id, name: order.manager.name } : null,
    customer: order.user
      ? {
          id: order.user.id,
          name: order.user.name,
          email: order.user.email,
          phone: order.user.phone,
          createdAt: order.user.createdAt,
        }
      : null,
    items:
      order.items?.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        slug: item.slug,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        weight: item.weight,
        flavor: item.flavor,
        lineTotal: Math.round(item.price * item.quantity * 100) / 100,
      })) ?? [],
    notes:
      order.notes?.map((note) => ({
        id: note.id,
        text: note.text,
        createdAt: note.createdAt,
        author: note.author ? { id: note.author.id, name: note.author.name } : null,
      })) ?? [],
  };
}

export function serializeReview(
  review: Review & {
    user?: Pick<User, 'id' | 'name'> | null;
    product?: Pick<Product, 'id' | 'name' | 'slug' | 'image'> | null;
  },
) {
  return {
    id: review.id,
    rating: review.rating,
    text: review.text,
    isApproved: review.isApproved,
    createdAt: review.createdAt,
    author: review.user ? { id: review.user.id, name: review.user.name } : null,
    product: review.product
      ? {
          id: review.product.id,
          name: review.product.name,
          slug: review.product.slug,
          image: review.product.image,
        }
      : null,
  };
}
