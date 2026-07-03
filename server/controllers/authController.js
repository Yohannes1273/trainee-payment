import User from '../models/User.js';
import Trainee from '../models/Trainee.js';
import Section from '../models/Section.js';
import { generateToken } from '../middleware/auth.js';
import crypto from 'crypto';
import Notification from '../models/Notification.js';

export async function login(req, res) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Please enter both username and password.' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Determine subprofile if student
    let traineeProfile = null;
    if (user.role === 'Trainee') {
      traineeProfile = await Trainee.findOne({ userId: user._id });
    }

    // Generate token
    const token = generateToken({
      id: user._id,
      username: user.username,
      role: user.role,
      fullName: user.fullName
    });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        isPasswordChanged: user.isPasswordChanged,
        profilePicture: user.profilePicture || null
      },
      trainee: traineeProfile
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getCurrentUser(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User session not found or expired. Please log in again.' });
    }

    let traineeProfile = null;
    if (user.role === 'Trainee') {
      traineeProfile = await Trainee.findOne({ userId: user._id });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        isPasswordChanged: user.isPasswordChanged,
        profilePicture: user.profilePicture || null
      },
      trainee: traineeProfile
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function registerTrainee(req, res) {
  try {
    const { fullName, email, sectionId, rollNumber, telegramChatId } = req.body;

    if (!fullName || !sectionId) {
      return res.status(400).json({ error: 'Please provide the trainee\'s full name and section.' });
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Selected Academic Section does not exist.' });
    }

    // Explicitly enforce that Registrar CANNOT manually specify username/password.
    // They are generated in the pre-save hook of the User model.
    const traineeUser = await User.create({
      fullName,
      email: email || `${fullName.toLowerCase().replace(/\s+/g, '')}@polytech.edu`,
      role: 'Trainee'
    });

    // Auto-generate roll number if not provided
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const finalRollNumber = rollNumber || `PT/${randomNum}/${currentYear}`;

    const trainee = await Trainee.create({
      userId: traineeUser._id,
      sectionId,
      rollNumber: finalRollNumber,
      telegramChatId: telegramChatId || '',
      admissionStatus: 'Active'
    });

    res.status(201).json({
      message: 'Trainee registered and enrolled successfully.',
      username: traineeUser.username,
      defaultPassword: '123',
      trainee,
      user: {
        id: traineeUser._id,
        username: traineeUser.username,
        email: traineeUser.email,
        fullName: traineeUser.fullName,
        role: traineeUser.role,
        isPasswordChanged: traineeUser.isPasswordChanged,
        profilePicture: traineeUser.profilePicture || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Please enter your registered email address.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email address.' });
    }

    // Generate secure random recovery token
    const token = crypto.randomBytes(24).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration
    await user.save();

    // Secure recovery link
    const recoveryLink = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;

    // Simulate sending email: Log to server terminal
    console.log(`\n========================================`);
    console.log(`✉️ SECURE PASSWORD RECOVERY EMAIL`);
    console.log(`To: ${user.fullName} (${user.email})`);
    console.log(`Recovery Link: ${recoveryLink}`);
    console.log(`This link expires in 1 hour.`);
    console.log(`========================================\n`);

    // Create an in-app system notification so the user can easily find it during testing
    await Notification.create({
      userId: user._id.toString(),
      title: '🔐 Password Recovery Requested',
      message: `A password reset was requested. Copy this token: ${token}`,
      type: 'warning'
    });

    res.json({
      success: true,
      message: `A secure password recovery link has been dispatched to ${user.email}.`,
      simulatedLink: recoveryLink,
      token: token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password recovery token.' });
    }

    // Update password
    user.password = newPassword;
    user.isPasswordChanged = true;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Create confirmation in-app notification
    await Notification.create({
      userId: user._id.toString(),
      title: '🔒 Password Changed Successfully',
      message: 'Your account password has been successfully reset. Use your new password to log in.',
      type: 'success'
    });

    res.json({
      success: true,
      message: 'Your password has been successfully reset. Please log in with your new password.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

const authController = {
  login,
  getCurrentUser,
  registerTrainee,
  forgotPassword,
  resetPassword
};

export default authController;
