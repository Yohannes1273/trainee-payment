import mongoose, { Schema } from './db.js';
import bcrypt from 'bcryptjs';
import softDeletePlugin from './softDeletePlugin.js';

const UserSchema = new Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Registrar', 'HR', 'Department Head', 'Trainer', 'Trainee', 'Finance', 'Night Controller'], 
    required: true 
  },
  fullName: { type: String, required: true },
  isPasswordChanged: { type: Boolean, default: false },
  departmentId: { type: String, default: null }, // Linked Department for Dept Head
  assignedPrograms: { type: Array, default: [] }, // Assigned program strings for Finance staff (e.g. ['Regular'])
  profilePicture: { type: String, default: null }, // Relative path to uploaded avatar
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
});

UserSchema.plugin(softDeletePlugin);

// Pre-save hook to auto-generate username/password and hash password
UserSchema.pre('save', async function(next) {
  // Only auto-generate credentials for new Trainees if not already explicitly provided
  if (this.isNew && this.role === 'Trainee') {
    try {
      if (!this.username) {
        let firstName = '';
        let lastName = '';
        const nameParts = (this.fullName || '').trim().split(/\s+/);
        if (nameParts.length >= 2) {
          firstName = nameParts[0];
          lastName = nameParts[nameParts.length - 1];
        } else if (nameParts.length === 1) {
          firstName = nameParts[0];
        }

        // Handle names shorter than 3 characters gracefully
        const fPart = firstName.slice(0, 3).toLowerCase();
        const lPart = lastName.slice(0, 3).toLowerCase();
        let baseUsername = fPart + lPart;
        if (!baseUsername) {
          baseUsername = 'trainee';
        }

        // Ensure unique username by appending a counter if it already exists
        let finalUsername = baseUsername;
        let counter = 1;
        while (await this.constructor.findOne({ username: finalUsername })) {
          finalUsername = `${baseUsername}${counter}`;
          counter++;
        }
        this.username = finalUsername;
      }

      if (!this.password) {
        this.password = '123';
      }

      if (this.isPasswordChanged === undefined) {
        this.isPasswordChanged = false; // default for new trainees
      }
    } catch (err) {
      return next(err);
    }
  }

  if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    return false;
  }
};

const User = mongoose.model('User', UserSchema);
export default User;
