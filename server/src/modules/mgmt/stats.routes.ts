import { Router } from 'express';
import { prisma } from '../../prisma';
import { ORDER_STATUSES } from '../../lib/constants';
import { asyncHandler } from '../../lib/http';
import { money } from '../../lib/money';
import { serializeOrder } from '../../lib/serialize';
import { requireStaff } from '../../middleware/auth';

const router = Router();

const LOW_STOCK_THRESHOLD = 10;

/** GET /api/mgmt/stats — dashboard for both the admin and the manager panel. */
router.get(
  '/',
  requireStaff,
  asyncHandler(async (_req, res) => {
    const [statusGroups, orders, clientCount, productCount, lowStock, topProducts, recentOrders] =
      await Promise.all([
        prisma.order.groupBy({ by: ['status'], _count: { _all: true }, _sum: { total: true } }),
        prisma.order.findMany({
          where: { status: { not: 'CANCELLED' } },
          select: { total: true, createdAt: true },
        }),
        prisma.user.count({ where: { role: 'CLIENT' } }),
        prisma.product.count(),
        prisma.product.findMany({
          where: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD } },
          select: { id: true, name: true, slug: true, stock: true, image: true },
          orderBy: { stock: 'asc' },
          take: 8,
        }),
        prisma.product.findMany({
          where: { soldCount: { gt: 0 } },
          select: { id: true, name: true, slug: true, soldCount: true, price: true, image: true },
          orderBy: { soldCount: 'desc' },
          take: 8,
        }),
        prisma.order.findMany({
          include: { items: true, user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } } },
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
      ]);

    const byStatus = Object.fromEntries(
      ORDER_STATUSES.map((status) => [
        status,
        statusGroups.find((group) => group.status === status)?._count._all ?? 0,
      ]),
    ) as Record<string, number>;

    const revenue = money(orders.reduce((sum, order) => sum + order.total, 0));
    const orderCount = statusGroups.reduce((sum, group) => sum + group._count._all, 0);

    // Last 14 days of turnover for the dashboard sparkline. Buckets run from
    // local midnight to local midnight, and the key is built from local date
    // parts — toISOString() would shift the label a day for positive offsets.
    const localDateKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`;

    const days: { date: string; revenue: number; orders: number }[] = [];
    for (let offset = 13; offset >= 0; offset -= 1) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - offset);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);

      const dayOrders = orders.filter(
        (order) => order.createdAt >= day && order.createdAt < next,
      );
      days.push({
        date: localDateKey(day),
        revenue: money(dayOrders.reduce((sum, order) => sum + order.total, 0)),
        orders: dayOrders.length,
      });
    }

    res.json({
      orderCount,
      byStatus,
      revenue,
      averageOrder: orders.length ? money(revenue / orders.length) : 0,
      clientCount,
      productCount,
      lowStockCount: lowStock.length,
      lowStock,
      topProducts,
      recentOrders: recentOrders.map(serializeOrder),
      daily: days,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    });
  }),
);

export default router;
