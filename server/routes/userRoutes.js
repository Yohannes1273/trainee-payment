import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { changePassword, uploadAvatar } from '../controllers/userController.js';

const router = express.Router();

// Setup multer disk storage for avatar
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `avatar_${Date.now()}_${Math.random().toString(36).substr(2, 5)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit for avatar
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    if (allowed.test(ext) && allowed.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (.png, .jpg, .jpeg, .webp) are allowed!'));
    }
  }
});

// Password change endpoint (authenticated)
router.post('/change-password', authenticateToken, changePassword);

// Avatar upload endpoint (authenticated PUT /api/users/upload-avatar)
router.put('/upload-avatar', authenticateToken, upload.single('avatar'), uploadAvatar, (error, req, res, next) => {
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

export default router;
