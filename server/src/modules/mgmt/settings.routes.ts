import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { SHOP_DOMAIN, SHOP_NAME } from '../../lib/constants';
import { asyncHandler } from '../../lib/http';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

/** System settings are admin-only by design — a manager cannot reach them. */
router.use(requireAdmin);

export const DEFAULT_SETTINGS: Record<string, string> = {
  shopName: SHOP_NAME,
  supportPhone: '+380 44 000 00 00',
  supportEmail: `support@${SHOP_DOMAIN}`,
  freeDeliveryFrom: '1500',
  lowStockThreshold: '10',
  announcement: 'Безкоштовна доставка від 1500 ₴',
};

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.setting.findMany();
    const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    res.json({ items: { ...DEFAULT_SETTINGS, ...stored } });
  }),
);

router.put(
  '/',
  validate(z.record(z.string().max(500))),
  asyncHandler(async (req, res) => {
    const body = req.body as Record<string, string>;
    const allowed = Object.keys(DEFAULT_SETTINGS);

    for (const [key, value] of Object.entries(body)) {
      if (!allowed.includes(key)) continue;
      await prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }

    const rows = await prisma.setting.findMany();
    res.json({
      items: { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((row) => [row.key, row.value])) },
      message: 'Налаштування збережено',
    });
  }),
);

export default router;
