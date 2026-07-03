import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  bootstrapSystem,
  registerTrainer,
  assignTrainerToSection,
  getTrainerSectionCompliance,
  getDepartments,
  createDepartment,
  getOccupations,
  createOccupation,
  getPrograms,
  createProgram,
  getEntryYears,
  createEntryYear,
  getLevels,
  createLevel,
  getSections,
  createSection,
  getTrainers
} from '../controllers/setupController.js';
import { registerTrainee } from '../controllers/authController.js';

const router = express.Router();

// Public setup triggers
router.post('/bootstrap', bootstrapSystem);

// Authenticated setup routes
router.use(authenticateToken);

// HR registering trainers
router.post('/register-trainer', requireRole(['HR']), registerTrainer);

// Registrar registering trainees
router.post('/register-trainee', requireRole(['Registrar']), registerTrainee);

// Department Head assigning trainers to sections
router.post('/assign-trainer', requireRole(['Department Head']), assignTrainerToSection);

// Trainer viewing section compliance
router.get('/trainer-compliance', requireRole(['Trainer']), getTrainerSectionCompliance);

// Read configurations (accessible by Registrar, HR, Dept Head)
const allowedStaff = ['Registrar', 'HR', 'Department Head', 'Finance', 'Night Controller'];

router.get('/departments', requireRole(allowedStaff), getDepartments);
router.post('/departments', requireRole(['Registrar']), createDepartment);

router.get('/occupations', requireRole(allowedStaff), getOccupations);
router.post('/occupations', requireRole(['Registrar']), createOccupation);

router.get('/programs', requireRole(allowedStaff), getPrograms);
router.post('/programs', requireRole(['Registrar']), createProgram);

router.get('/entry-years', requireRole(allowedStaff), getEntryYears);
router.post('/entry-years', requireRole(['Registrar']), createEntryYear);

router.get('/levels', requireRole(allowedStaff), getLevels);
router.post('/levels', requireRole(['Registrar']), createLevel);

router.get('/sections', requireRole(allowedStaff), getSections);
router.post('/sections', requireRole(['Registrar']), createSection);

router.get('/trainers', requireRole(allowedStaff), getTrainers);

export default router;
