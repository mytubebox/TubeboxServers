import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import adminRoutes from './routes/admin';
import publicRoutes from './routes/public';

dotenv.config();

const app = express();
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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔍 Request logger
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);

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
app.use((err: any, req: any, res: any, next: any) => {
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