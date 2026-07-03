import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generateReport, getAuditLogs, getFinancialReport } from '../controllers/reportController.js';

const router = express.Router();

// Apply authentication token verification to all reports endpoints
router.use(authenticateToken);

// Dynamic Drill-Down Financial Report Engine (Accessible to Night Controller and other higher roles)
router.get('/financial', requireRole(['Night Controller', 'Department Head', 'Finance', 'Registrar']), getFinancialReport);

// Generate flat audit report (Night Controller only as requested, but we can also allow Department Head/Finance/Registrar to read if needed)
router.post('/generate', requireRole(['Night Controller', 'Department Head', 'Finance', 'Registrar']), generateReport);

// Retrieve reporting & notification audit trail
router.get('/audit-logs', requireRole(['Night Controller', 'Department Head', 'Finance', 'Registrar']), getAuditLogs);

export default router;
