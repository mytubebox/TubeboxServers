import { Router } from 'express';
import { getVideos, getVideoById, viewVideo, likeVideo, downloadVideo } from '../controllers/publicController';

const router = Router();

// Publicly accessible routes
router.get('/videos', getVideos);
router.get('/videos/:id', getVideoById);
router.post('/videos/:id/view', viewVideo);
router.post('/videos/:id/like', likeVideo);
router.post('/videos/:id/download', downloadVideo);

export default router;
