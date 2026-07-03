import User from '../models/User.js';
import Trainee from '../models/Trainee.js';
import Section from '../models/Section.js';
import Department from '../models/Department.js';
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

    // Fetch department details if user is a Department Head
    let departmentName = '';
    let departmentId = user.departmentId || null;
    if (user.role === 'Department Head') {
      const dept = await Department.findOne({ $or: [{ headId: user._id }, { _id: user.departmentId }] });
      if (dept) {
        departmentName = dept.name;
        departmentId = dept._id.toString();
      }
    }

    // Generate token with department context
    const token = generateToken({
      id: user._id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      departmentId,
      department: departmentName
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
        profilePicture: user.profilePicture || null,
        departmentId,
        department: departmentName
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

    // Fetch department details if user is a Department Head
    let departmentName = '';
    let departmentId = user.departmentId || null;
    if (user.role === 'Department Head') {
      const dept = await Department.findOne({ $or: [{ headId: user._id }, { _id: user.departmentId }] });
      if (dept) {
        departmentName = dept.name;
        departmentId = dept._id.toString();
      }
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        isPasswordChanged: user.isPasswordChanged,
        profilePicture: user.profilePicture || null,
        departmentId,
        department: departmentName
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

export async function register(req, res) {
  try {
    const { fullName, email, role, password, departmentId, sectionId, username } = req.body;

    if (!fullName || !email || !role || !password) {
      return res.status(400).json({ error: 'Please provide all required fields: full name, email, role, password.' });
    }

    const allowedRoles = ['Registrar', 'HR', 'Department Head', 'Trainer', 'Trainee', 'Finance', 'Night Controller'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role selected. Allowed: ${allowedRoles.join(', ')}` });
    }

    // Check if email already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    // Generate or use username
    let finalUsername = username;
    if (!finalUsername) {
      const nameParts = fullName.trim().split(/\s+/);
      const first = nameParts[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
      const last = nameParts[nameParts.length - 1]?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
      finalUsername = `${first}${last}`.slice(0, 10);
      
      // Ensure unique username
      let counter = 1;
      let checkUsername = finalUsername;
      while (await User.findOne({ username: checkUsername })) {
        checkUsername = `${finalUsername}${counter}`;
        counter++;
      }
      finalUsername = checkUsername;
    } else {
      const exists = await User.findOne({ username: finalUsername });
      if (exists) {
        return res.status(400).json({ error: 'Username is already taken.' });
      }
    }

    // Create user
    const user = await User.create({
      username: finalUsername,
      password, // User save pre-hook will hash this
      email,
      role,
      fullName,
      departmentId: departmentId || null,
      isPasswordChanged: true
    });

    // Special logic for Trainee profile
    let traineeProfile = null;
    if (role === 'Trainee') {
      let targetSectionId = sectionId;
      if (!targetSectionId) {
        // Find any section in the system so we can register the trainee
        const anySection = await Section.findOne();
        if (anySection) {
          targetSectionId = anySection._id.toString();
        } else {
          return res.status(400).json({ error: 'No sections exist in the TVET system. Cannot register trainee yet.' });
        }
      }

      // Generate unique roll number
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const currentYear = new Date().getFullYear().toString().slice(-2);
      const finalRollNumber = `PT/${randomNum}/${currentYear}`;

      traineeProfile = await Trainee.create({
        userId: user._id,
        sectionId: targetSectionId,
        rollNumber: finalRollNumber,
        admissionStatus: 'Active'
      });
    }

    // Special logic for Trainer / Department Head
    if (role === 'Trainer' && departmentId) {
      const dept = await Department.findById(departmentId);
      if (dept) {
        dept.trainerIds.push(user._id);
        await dept.save();
      }
    } else if (role === 'Department Head' && departmentId) {
      const dept = await Department.findById(departmentId);
      if (dept) {
        dept.headId = user._id;
        await dept.save();
      }
    }

    // Fetch department details to include in token
    let departmentName = '';
    if (departmentId) {
      const dept = await Department.findById(departmentId);
      if (dept) {
        departmentName = dept.name;
      }
    }

    // Generate JWT token
    const token = generateToken({
      id: user._id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      departmentId: user.departmentId || null,
      department: departmentName
    });

    res.status(201).json({
      message: 'Account registered successfully!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        isPasswordChanged: user.isPasswordChanged,
        profilePicture: user.profilePicture || null,
        departmentId: user.departmentId || null,
        department: departmentName
      },
      trainee: traineeProfile
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getPublicDepartments(req, res) {
  try {
    const list = await Department.find();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getPublicSections(req, res) {
  try {
    const list = await Section.find();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

const authController = {
  login,
  getCurrentUser,
  registerTrainee,
  forgotPassword,
  resetPassword,
  register,
  getPublicDepartments,
  getPublicSections
};

export default authController;
