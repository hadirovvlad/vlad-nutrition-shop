import { Router } from 'express';
import { requireAuth, requireStaff } from '../../middleware/auth';
import orders from './orders.routes';
import products from './products.routes';
import reviews from './reviews.routes';
import settings from './settings.routes';
import stats from './stats.routes';
import taxonomy from './taxonomy.routes';
import uploads from './uploads.routes';
import users from './users.routes';

const router = Router();

// Two gates before anything else: authenticated, and staff.
// Individual routers narrow further to ADMIN where the spec requires it.
router.use(requireAuth, requireStaff);

router.get('/whoami', (req, res) => {
  res.json({ role: req.user!.role, id: req.user!.id, name: req.user!.name });
});

router.use('/stats', stats);
router.use('/orders', orders);
router.use('/products', products);
router.use('/users', users);
router.use('/reviews', reviews);
router.use('/settings', settings);
router.use('/uploads', uploads);
router.use('/', taxonomy);

export default router;
