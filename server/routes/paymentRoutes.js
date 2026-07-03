import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { 
  submitPayment, 
  getPendingPayments, 
  verifyPayment, 
  getNightControllerQueue, 
  auditReceipt,
  getPaymentLogs,
  getAggregationSummary,
  triggerTrainerAnnouncement,
  searchPayments,
  upload
} from '../controllers/paymentController.js';

const router = express.Router();

// Apply auth to all payment endpoints
router.use(authenticateToken);

// Submit payment slip (Trainee only)
router.post('/submit', requireRole(['Trainee']), upload.single('slip'), submitPayment);

// Get pending queue for Finance review
router.get('/pending', requireRole(['Finance']), getPendingPayments);

// Action verification: Approve/Reject a slip
router.post('/verify/:paymentId', requireRole(['Finance']), verifyPayment);

// Get Night Controller Queue
router.get('/night-queue', requireRole(['Night Controller']), getNightControllerQueue);

// Night Controller Audit completion
router.post('/audit/:receiptId', requireRole(['Night Controller']), auditReceipt);

// Search / Filter payments dynamically by multi-criteria (Finance and Night Controller)
router.get('/search', requireRole(['Registrar', 'Finance', 'Night Controller', 'Department Head']), searchPayments);

// View full history ledger logs
router.get('/logs', requireRole(['Registrar', 'Finance', 'Night Controller', 'Department Head']), getPaymentLogs);

// Get financial aggregation summary traversing complete path
router.get('/aggregation-summary', requireRole(['Night Controller', 'Department Head', 'Finance', 'Registrar']), getAggregationSummary);

// Trigger Telegram announcement to Trainer
router.post('/announce-trainer', requireRole(['Night Controller', 'Department Head', 'Finance', 'Registrar']), triggerTrainerAnnouncement);

export default router;
