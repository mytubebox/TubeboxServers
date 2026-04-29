import { Router } from 'express';
import { getFullAnalytics } from '../controllers/analyticsController';

const router = Router();

// Open route for full platform analytics (no authorization)
router.get('/', getFullAnalytics);

export default router;
