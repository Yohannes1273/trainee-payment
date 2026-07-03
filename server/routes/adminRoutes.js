import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  getAdminStats,
  listAllUsers,
  updateUserRoleAndAssignments,
  deleteDepartment,
  createDepartment,
  createOccupation,
  createProgram,
  createEntryYear,
  createLevel,
  createSection
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require a valid authenticated session
router.use(authenticateToken);

// System Health Widget stats (Accessible by HR and Registrar)
router.get('/stats', requireRole(['HR', 'Registrar']), getAdminStats);

// User and RBAC management (Accessible ONLY by HR acting as Global Admin)
router.get('/users', requireRole(['HR']), listAllUsers);
router.put('/users/:userId/role', requireRole(['HR']), updateUserRoleAndAssignments);
router.delete('/departments/:id', requireRole(['HR']), deleteDepartment);

// Hierarchy Creation / Modification (Accessible by HR and Registrar)
router.post('/hierarchy/departments', requireRole(['HR', 'Registrar']), createDepartment);
router.post('/hierarchy/occupations', requireRole(['HR', 'Registrar']), createOccupation);
router.post('/hierarchy/programs', requireRole(['HR', 'Registrar']), createProgram);
router.post('/hierarchy/years', requireRole(['HR', 'Registrar']), createEntryYear);
router.post('/hierarchy/levels', requireRole(['HR', 'Registrar']), createLevel);
router.post('/hierarchy/sections', requireRole(['HR', 'Registrar']), createSection);

export default router;
