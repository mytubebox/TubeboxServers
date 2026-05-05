"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analyticsController_1 = require("../controllers/analyticsController");
const router = (0, express_1.Router)();
// Open route for full platform analytics (no authorization)
router.get('/', analyticsController_1.getFullAnalytics);
exports.default = router;
