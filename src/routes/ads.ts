






import { Router } from 'express';
import { recordImpression, getAdsAnalytics } from '../controllers/adsController';

const router = Router();

// Publicly accessible POST for clients to record an impression
router.post('/event', recordImpression);

// Admin-level GET analytics (No Authorization as requested)
router.get('/analytics', getAdsAnalytics);

export default router;
