import User from '../models/User.js';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'public', 'uploads');

export async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Please fill in all password fields.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation password do not match.' });
    }

    if (newPassword.length < 3) {
      return res.status(400).json({ error: 'New password must be at least 3 characters long.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User session not found or expired. Please log in again.' });
    }

    // Compare with old password
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password.' });
    }

    // Set new password (this will trigger hashing in pre-save hook)
    user.password = newPassword;
    user.isPasswordChanged = true;
    await user.save();

    res.json({
      message: 'Password changed successfully. First-time setup complete.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function uploadAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: 'User profile not found or expired. Please log in again.' });
    }

    // If an old profile picture exists, delete it from storage
    if (user.profilePicture) {
      try {
        const oldFilename = user.profilePicture.split('/').pop();
        if (oldFilename) {
          const oldPath = path.join(uploadDir, oldFilename);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      } catch (err) {
        console.error('Error deleting old avatar file:', err);
      }
    }

    // Set new profile picture path
    const relativePath = `/uploads/${req.file.filename}`;
    user.profilePicture = relativePath;
    await user.save();

    res.json({
      message: 'Profile picture updated successfully.',
      profilePicture: relativePath,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePicture: relativePath
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

const userController = {
  changePassword,
  uploadAvatar
};

export default userController;
