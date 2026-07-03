import User from '../models/User.js';
import Department from '../models/Department.js';
import Occupation from '../models/Occupation.js';
import Program from '../models/Program.js';
import EntryYear from '../models/EntryYear.js';
import Level from '../models/Level.js';
import Section from '../models/Section.js';
import Trainee from '../models/Trainee.js';

/**
 * Fetch Admin Dashboard Stats (System Health Widget)
 */
export async function getAdminStats(req, res) {
  try {
    const totalTrainees = await Trainee.countDocuments({});
    
    // Total Active Trainers
    const trainers = await User.find({ role: 'Trainer' });
    const totalTrainers = trainers.length;

    // Count of Sections that have no trainer assigned (missing a trainer)
    const sections = await Section.find({});
    const unassignedSections = sections.filter(sec => !sec.trainerId).length;

    res.json({
      totalTrainees,
      totalTrainers,
      unassignedSections
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * List all users with administrative details
 */
export async function listAllUsers(req, res) {
  try {
    const users = await User.find({});
    // Exclude password hashes from response
    const sanitized = users.map(u => {
      const json = u.toJSON ? u.toJSON() : u;
      delete json.password;
      return json;
    });
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Update User Role and RBAC Assignments (Department Head, Finance, etc.)
 */
export async function updateUserRoleAndAssignments(req, res) {
  const { userId } = req.params;
  const { role, departmentId, assignedPrograms } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    // Update role
    if (role) {
      user.role = role;
    }

    // Apply specific department mapping for Department Head
    if (role === 'Department Head' && departmentId) {
      user.departmentId = departmentId;
      
      // Update Department model with headId to ensure dual-integrity
      const dept = await Department.findById(departmentId);
      if (dept) {
        dept.headId = userId;
        await dept.save();
      }
    } else {
      user.departmentId = null;
    }

    // Apply specific program mapping for Finance Staff
    if (role === 'Finance' && assignedPrograms) {
      user.assignedPrograms = Array.isArray(assignedPrograms) ? assignedPrograms : [assignedPrograms];
    } else {
      user.assignedPrograms = [];
    }

    await user.save();

    res.json({
      message: `User ${user.fullName} updated successfully to role ${user.role}.`,
      user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Cascade Delete Protection logic for Department
 */
export async function deleteDepartment(req, res) {
  const { id } = req.params;
  try {
    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    // 1. Check if Occupations are assigned to this Department
    const linkedOccupations = await Occupation.find({ departmentId: id });
    if (linkedOccupations.length > 0) {
      return res.status(400).json({
        error: `Cascade Delete Blocked: Department '${dept.name}' cannot be deleted because it has ${linkedOccupations.length} linked Occupations (e.g. ${linkedOccupations[0].name}). Please reassign or delete them first.`
      });
    }

    // 2. Check if trainers are associated/linked to this department
    if (dept.trainerIds && dept.trainerIds.length > 0) {
      return res.status(400).json({
        error: `Cascade Delete Blocked: Department '${dept.name}' cannot be deleted because it has ${dept.trainerIds.length} assigned Trainer Faculty members. Please reassign trainers to other departments first.`
      });
    }

    await Department.deleteOne({ _id: id });
    res.json({ message: `Department '${dept.name}' deleted successfully.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Hierarchy Creation Endpoint: Create Department
 */
export async function createDepartment(req, res) {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Department name is required.' });
  }
  try {
    const dept = await Department.create({ name, headId: null, trainerIds: [] });
    res.status(201).json(dept);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Hierarchy Creation Endpoint: Create Occupation
 */
export async function createOccupation(req, res) {
  const { name, departmentId } = req.body;
  if (!name || !departmentId) {
    return res.status(400).json({ error: 'Occupation name and Department ID are required.' });
  }
  try {
    // Validate parent exists
    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(404).json({ error: 'Parent Department not found.' });
    }

    const occ = await Occupation.create({ name, departmentId });
    res.status(201).json(occ);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Hierarchy Creation Endpoint: Create Program
 */
export async function createProgram(req, res) {
  const { name, occupationId } = req.body;
  if (!name || !occupationId) {
    return res.status(400).json({ error: 'Program name and Occupation ID are required.' });
  }
  try {
    // Validate parent exists
    const occ = await Occupation.findById(occupationId);
    if (!occ) {
      return res.status(404).json({ error: 'Parent Occupation not found.' });
    }

    const prog = await Program.create({ name, occupationId });
    res.status(201).json(prog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Hierarchy Creation Endpoint: Create EntryYear
 */
export async function createEntryYear(req, res) {
  const { year, programId } = req.body;
  if (!year || !programId) {
    return res.status(400).json({ error: 'Entry Year and Program ID are required.' });
  }
  try {
    // Validate parent exists
    const prog = await Program.findById(programId);
    if (!prog) {
      return res.status(404).json({ error: 'Parent Program stream not found.' });
    }

    const entryYear = await EntryYear.create({ year, programId });
    res.status(201).json(entryYear);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Hierarchy Creation Endpoint: Create Level
 */
export async function createLevel(req, res) {
  const { levelNumber, entryYearId } = req.body;
  if (!levelNumber || !entryYearId) {
    return res.status(400).json({ error: 'Level Number and Entry Year ID are required.' });
  }
  try {
    // Validate parent exists
    const entry = await EntryYear.findById(entryYearId);
    if (!entry) {
      return res.status(404).json({ error: 'Parent Entry Year not found.' });
    }

    const level = await Level.create({ levelNumber: Number(levelNumber), entryYearId });
    res.status(201).json(level);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Hierarchy Creation Endpoint: Create Section
 */
export async function createSection(req, res) {
  const { name, levelId, maxCapacity, trainerId } = req.body;
  if (!name || !levelId) {
    return res.status(400).json({ error: 'Section name and Level ID are required.' });
  }
  try {
    // Validate parent exists
    const level = await Level.findById(levelId);
    if (!level) {
      return res.status(404).json({ error: 'Parent Level not found.' });
    }

    const section = await Section.create({
      name,
      levelId,
      maxCapacity: maxCapacity ? Number(maxCapacity) : 30,
      trainerId: trainerId || null
    });
    res.status(201).json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

const adminController = {
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
};

export default adminController;
