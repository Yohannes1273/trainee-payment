import express from 'express';
import { 
  login, 
  getCurrentUser, 
  forgotPassword, 
  resetPassword, 
  register, 
  getPublicDepartments, 
  getPublicSections 
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.get('/departments', getPublicDepartments);
router.get('/sections', getPublicSections);
router.get('/me', authenticateToken, getCurrentUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
