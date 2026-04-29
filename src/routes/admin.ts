import { Router } from 'express';
import multer from 'multer';
import { authenticateAdmin } from '../middlewares/auth';
import { login, signup, getAnalytics, getAllVideos, uploadVideo, getVideoById, deleteVideo } from '../controllers/adminController';
import { getTelegramApiKey, updateTelegramApiKey } from '../controllers/telegramController';

const router = Router();

// We use multer to handle multipart/form-data for video uploads.
// In production, we'd stream this directly to B2, but for now we store it in memory or a temp folder.
const upload = multer({ dest: 'uploads/' });

// Auth
router.post('/login', login);
router.post('/signup', signup);

// Protected routes
router.use(authenticateAdmin);
router.get('/analytics', getAnalytics);
router.get('/videos', getAllVideos);
router.get('/videos/:id', getVideoById);
router.post('/videos', upload.single('video'), uploadVideo);
router.delete('/videos/:id', deleteVideo);

// Telegram API Key
router.get('/telegram/api-key', getTelegramApiKey);
router.put('/telegram/api-key', updateTelegramApiKey);

export default router;
