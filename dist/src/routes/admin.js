"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middlewares/auth");
const adminController_1 = require("../controllers/adminController");
const router = (0, express_1.Router)();
// We use multer to handle multipart/form-data for video uploads.
// In production, we'd stream this directly to B2, but for now we store it in memory or a temp folder.
const upload = (0, multer_1.default)({ dest: 'uploads/' });
// Auth
router.post('/login', adminController_1.login);
// Protected routes
router.use(auth_1.authenticateAdmin);
router.get('/analytics', adminController_1.getAnalytics);
router.get('/videos', adminController_1.getAllVideos);
router.get('/videos/:id', adminController_1.getVideoById);
router.post('/videos', upload.single('video'), adminController_1.uploadVideo);
exports.default = router;
