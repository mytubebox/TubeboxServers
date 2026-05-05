"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adsController_1 = require("../controllers/adsController");
const router = (0, express_1.Router)();
// Publicly accessible POST for clients to record an impression
router.post('/event', adsController_1.recordImpression);
// Admin-level GET analytics (No Authorization as requested)
router.get('/analytics', adsController_1.getAdsAnalytics);
exports.default = router;
