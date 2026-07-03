import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Load environment configuration
dotenv.config();

// Initialize express app
const app = express();
const PORT = 3000;

// Request body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create public/uploads folder if not exists
const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Serve uploaded slips statically
app.use('/uploads', express.static(uploadsPath));

// Import all API routes
import authRoutes from './server/routes/authRoutes.js';
import paymentRoutes from './server/routes/paymentRoutes.js';
import traineeRoutes from './server/routes/traineeRoutes.js';
import setupRoutes from './server/routes/setupRoutes.js';
import reportRoutes from './server/routes/reportRoutes.js';
import userRoutes from './server/routes/userRoutes.js';
import registrarRoutes from './server/routes/registrarRoutes.js';
import botRoutes from './server/routes/botRoutes.js';
import adminRoutes from './server/routes/adminRoutes.js';
import telegramTriggerRoutes from './server/routes/telegramTriggerRoutes.js';
import notificationRoutes from './server/routes/notificationRoutes.js';
import traineePaymentRoutes from './server/routes/traineePaymentRoutes.js';

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/trainees', traineeRoutes);
app.use('/api/trainee', traineePaymentRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/registrar', registrarRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/telegram-triggers', telegramTriggerRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Setup Vite Dev Server / Production Serving
async function initializeServer() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Express Server] Mounting Vite Dev Middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[Express Server] Serving production static files from dist...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind and listen
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=============================================================`);
    console.log(`🚀 POLYTECHNIC PAYMENT SYSTEM RUNNING ON: http://localhost:${PORT}`);
    console.log(`=============================================================`);
  });
}

initializeServer().catch(err => {
  console.error('[Express Server] Initialization Failed:', err);
});
