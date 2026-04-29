"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const admin_1 = __importDefault(require("./routes/admin"));
const public_1 = __importDefault(require("./routes/public"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// 🔍 DEBUG: show env status (safe, no secrets)
console.log('🚀 Starting server...');
console.log('ENV CHECK:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL ? 'SET ✅' : 'MISSING ❌',
    JWT_SECRET: process.env.JWT_SECRET ? 'SET ✅' : 'MISSING ❌'
});
// 🔥 Catch ALL crashes (VERY IMPORTANT)
process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (err) => {
    console.error('❌ UNHANDLED REJECTION:', err);
});
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// 🔍 Request logger
app.use((req, res, next) => {
    console.log(`➡️ ${req.method} ${req.url}`);
    next();
});
// Routes
app.use('/api/admin', admin_1.default);
app.use('/api', public_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date(),
        env: {
            db: process.env.DATABASE_URL ? 'connected?' : 'missing',
            jwt: process.env.JWT_SECRET ? 'set' : 'missing'
        }
    });
});
// ❌ Global error handler (Express)
app.use((err, req, res, next) => {
    console.error('🔥 EXPRESS ERROR:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err?.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : err?.stack
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
