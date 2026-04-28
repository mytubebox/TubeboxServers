"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const publicController_1 = require("../controllers/publicController");
const router = (0, express_1.Router)();
// Publicly accessible routes
router.get('/videos', publicController_1.getVideos);
router.get('/videos/:id', publicController_1.getVideoById);
router.post('/videos/:id/view', publicController_1.viewVideo);
router.post('/videos/:id/like', publicController_1.likeVideo);
router.post('/videos/:id/download', publicController_1.downloadVideo);
exports.default = router;
//# sourceMappingURL=public.js.map