import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../controllers/paymentController.js';
import { 
  requireTraineeAuth, 
  getTraineeHistory, 
  traineeUploadSlip, 
  simulatePenalties 
} from '../controllers/traineeController.js';

const router = express.Router();

// Apply base authentication
router.use(authenticateToken);

// Apply data isolation guardrail to all endpoints in this route group
router.use(requireTraineeAuth);

// GET /api/trainee/history - Strict scope history log
router.get('/history', getTraineeHistory);

// POST /api/trainee/upload-slip - Single student self-service upload
router.post('/upload-slip', upload.single('slip'), traineeUploadSlip);

// GET /api/trainee/penalty-simulation - Simulated dynamic penalties calculator
router.get('/penalty-simulation', simulatePenalties);

export default router;
