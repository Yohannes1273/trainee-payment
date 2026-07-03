import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getTraineeLedger, updateTelegramChatId, updateNotificationPreferences } from '../controllers/traineeController.js';

const router = express.Router();

router.use(authenticateToken);

// Retrieve active ledger, balance and block metrics (Trainee only)
router.get('/ledger', requireRole(['Trainee']), getTraineeLedger);

// Link personal Telegram Chat ID for automated updates
router.post('/telegram', requireRole(['Trainee']), updateTelegramChatId);

// Update personal notification preferences
router.put('/preferences', requireRole(['Trainee']), updateNotificationPreferences);

export default router;
