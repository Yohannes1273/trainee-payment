import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  promoteTrainee,
  transferSection,
  proposeSectionBalancing,
  autoAssignSectionBalancing,
  getAcademicHistory,
  getTraineesList
} from '../controllers/registrarController.js';

const router = express.Router();

// Authenticate all routes
router.use(authenticateToken);

// Read trainees list (Accessible by Registrar)
router.get('/trainees', requireRole(['Registrar']), getTraineesList);

// Read history log (Accessible by Registrar)
router.get('/history', requireRole(['Registrar']), getAcademicHistory);

// Section balancing proposals
router.get('/balance/propose/:levelId', requireRole(['Registrar']), proposeSectionBalancing);
router.post('/balance/auto-assign/:levelId', requireRole(['Registrar']), autoAssignSectionBalancing);

// Academic Promotion
router.post('/promote/:traineeId', requireRole(['Registrar']), promoteTrainee);

// Section Transfer
router.post('/transfer/:traineeId', requireRole(['Registrar']), transferSection);

export default router;
