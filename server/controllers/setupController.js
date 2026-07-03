import User from '../models/User.js';
import Department from '../models/Department.js';
import Occupation from '../models/Occupation.js';
import Program from '../models/Program.js';
import EntryYear from '../models/EntryYear.js';
import Level from '../models/Level.js';
import Section from '../models/Section.js';
import Trainee from '../models/Trainee.js';
import Payment from '../models/Payment.js';
import LocalReceipt from '../models/LocalReceipt.js';

/**
 * Bootstraps the database with comprehensive, realistic college data
 */
export async function bootstrapSystem(req, res) {
  try {
    // 1. Clear existing collections to reset cleanly
    await User.deleteOne({}); // Wait, deleteOne has query so let's delete all
    const collections = [User, Department, Occupation, Program, EntryYear, Level, Section, Trainee, Payment, LocalReceipt];
    
    // Simple custom clear by deletion
    for (const Model of collections) {
      const all = Model.find({ deleted: { $ne: true } });
      for (const doc of all) {
        await Model.deleteOne({ _id: doc._id });
      }
    }

    console.log('[Bootstrap] Initializing enterprise roles & users...');

    // 2. Create staff & trainee credentials
    const registrar = await User.create({
      username: 'registrar',
      password: 'registrar123',
      email: 'registrar@polytech.edu',
      role: 'Registrar',
      fullName: 'Aster Kebede',
      isPasswordChanged: true
    });

    const hr = await User.create({
      username: 'hr',
      password: 'hr123',
      email: 'hr@polytech.edu',
      role: 'HR',
      fullName: 'Yonas Hailu',
      isPasswordChanged: true
    });

    const deptHead = await User.create({
      username: 'depthead',
      password: 'depthead123',
      email: 'head.it@polytech.edu',
      role: 'Department Head',
      fullName: 'Dr. Yohannes Gebeyehu',
      isPasswordChanged: true
    });

    const finance = await User.create({
      username: 'finance',
      password: 'finance123',
      email: 'finance@polytech.edu',
      role: 'Finance',
      fullName: 'Almaz Tadesse',
      isPasswordChanged: true
    });

    const nightController = await User.create({
      username: 'nightcontroller',
      password: 'nightcontroller123',
      email: 'night.control@polytech.edu',
      role: 'Night Controller',
      fullName: 'Bekele Shiferaw',
      isPasswordChanged: true
    });

    const trainer1 = await User.create({
      username: 'trainer1',
      password: 'trainer123',
      email: 'trainer.solomon@polytech.edu',
      role: 'Trainer',
      fullName: 'Solomon Ayele',
      isPasswordChanged: true
    });

    const trainer2 = await User.create({
      username: 'trainer2',
      password: 'trainer123',
      email: 'trainer.selam@polytech.edu',
      role: 'Trainer',
      fullName: 'Selamawit Girma',
      isPasswordChanged: true
    });

    const trainee1User = await User.create({
      username: 'student1',
      password: 'student123',
      email: 'student.dawit@student.com',
      role: 'Trainee',
      fullName: 'Dawit Mekonnen',
      isPasswordChanged: true
    });

    const trainee2User = await User.create({
      username: 'student2',
      password: 'student123',
      email: 'student.meron@student.com',
      role: 'Trainee',
      fullName: 'Meron Tesfaye',
      isPasswordChanged: true
    });

    // 3. Register Academic Hierarchy
    const dept = await Department.create({
      name: 'Information Technology',
      headId: deptHead._id,
      trainerIds: [trainer1._id, trainer2._id]
    });

    const occ = await Occupation.create({
      name: 'Web Development',
      departmentId: dept._id
    });

    const progExtension = await Program.create({
      name: 'Extension',
      occupationId: occ._id
    });

    const progRegular = await Program.create({
      name: 'Regular',
      occupationId: occ._id
    });

    const year2024 = await EntryYear.create({
      year: '2024',
      programId: progExtension._id
    });

    const year2025 = await EntryYear.create({
      year: '2025',
      programId: progRegular._id
    });

    const level3 = await Level.create({
      levelNumber: 3,
      entryYearId: year2024._id
    });

    const level1 = await Level.create({
      levelNumber: 1,
      entryYearId: year2025._id
    });

    // Sections (with Assigned Trainers linked by Department Head)
    const secA = await Section.create({
      name: 'A',
      levelId: level3._id,
      trainerId: trainer1._id // Linked to trainer1
    });

    const secB = await Section.create({
      name: 'B',
      levelId: level1._id,
      trainerId: trainer2._id // Linked to trainer2
    });

    // 4. Register Trainees
    const trainee1 = await Trainee.create({
      userId: trainee1User._id,
      sectionId: secA._id,
      rollNumber: 'PT/1092/24',
      telegramChatId: '123456789', // test telegram chat id
      admissionStatus: 'Active'
    });

    const trainee2 = await Trainee.create({
      userId: trainee2User._id,
      sectionId: secB._id,
      rollNumber: 'PT/2088/25',
      telegramChatId: '987654321',
      admissionStatus: 'Active'
    });

    // 5. Add some mock payment history to look stunning on dashboards
    // Dawit (Extension Level 3, Monthly rate = 300 ETB, Upfront 3-month block = 900 ETB)
    // Dawit paid Block 1 on time
    const p1 = await Payment.create({
      traineeId: trainee1._id,
      programName: 'Extension',
      levelNumber: 3,
      amountPaid: 900,
      slipUrl: '/uploads/sample_slip.jpg',
      status: 'Approved',
      dueDate: new Date('2024-02-15T00:00:00Z'),
      paidDate: new Date('2024-02-10T00:00:00Z'),
      verifiedDate: new Date('2024-02-12T00:00:00Z'),
      verifiedBy: finance._id,
      penaltyDaysLate: 0,
      penaltyAmount: 0
    });

    const r1 = await LocalReceipt.create({
      receiptNumber: 'REC-10001',
      paymentId: p1._id,
      amount: 900,
      routedTo: 'NightControllerQueue',
      audited: true,
      auditedBy: nightController._id,
      auditedDate: new Date('2024-02-13T00:00:00Z'),
      notes: 'Verified against bank ledger sequence.'
    });

    p1.localReceiptId = r1._id;
    await p1.save();

    // Meron (Regular Level 1, Rate = 25 ETB/month, Upfront 6-month block = 150 ETB)
    // Meron submitted slip but it is currently Pending verification
    await Payment.create({
      traineeId: trainee2._id,
      programName: 'Regular',
      levelNumber: 1,
      amountPaid: 150,
      slipUrl: '/uploads/sample_slip.jpg',
      status: 'Pending',
      dueDate: new Date('2025-04-15T00:00:00Z'),
      paidDate: new Date('2025-04-12T00:00:00Z'),
      verifiedDate: null,
      verifiedBy: null,
      penaltyDaysLate: 0,
      penaltyAmount: 0
    });

    res.json({
      message: 'Collegiate database successfully bootstrapped with master academic hierarchy, trainers, and trainee test profiles.',
      credentials: [
        { role: 'Registrar', user: 'registrar', pass: 'registrar123' },
        { role: 'HR Manager', user: 'hr', pass: 'hr123' },
        { role: 'Department Head', user: 'depthead', pass: 'depthead123' },
        { role: 'Finance Officer', user: 'finance', pass: 'finance123' },
        { role: 'Night Controller', user: 'nightcontroller', pass: 'nightcontroller123' },
        { role: 'Trainer 1', user: 'trainer1', pass: 'trainer123' },
        { role: 'Trainee 1 (Dawit)', user: 'student1', pass: 'student123' },
        { role: 'Trainee 2 (Meron)', user: 'student2', pass: 'student123' }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * HR registers institutional trainers
 */
export async function registerTrainer(req, res) {
  try {
    const { username, password, email, fullName, departmentId } = req.body;
    
    if (!username || !password || !email || !fullName || !departmentId) {
      return res.status(400).json({ error: 'Missing trainer registration details.' });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const trainerUser = await User.create({
      username,
      password,
      email,
      fullName,
      role: 'Trainer'
    });

    // Add trainer to Department
    const dept = await Department.findById(departmentId);
    if (dept) {
      dept.trainerIds.push(trainerUser._id);
      await dept.save();
    }

    res.status(201).json({
      message: 'Trainer registered successfully.',
      trainer: trainerUser
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * Registrar registers new trainees
 */
export async function registerTrainee(req, res) {
  try {
    const { username, password, email, fullName, sectionId, rollNumber, telegramChatId } = req.body;

    if (!username || !password || !email || !fullName || !sectionId || !rollNumber) {
      return res.status(400).json({ error: 'Missing trainee registration details.' });
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Selected Academic Section does not exist.' });
    }

    const traineeUser = await User.create({
      username,
      password,
      email,
      fullName,
      role: 'Trainee'
    });

    const trainee = await Trainee.create({
      userId: traineeUser._id,
      sectionId,
      rollNumber,
      telegramChatId: telegramChatId || '',
      admissionStatus: 'Active'
    });

    res.status(201).json({
      message: 'Trainee registered and enrolled into Section successfully.',
      trainee,
      user: traineeUser
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * Department Head links assigned trainer to target Section
 */
export async function assignTrainerToSection(req, res) {
  try {
    const { sectionId, trainerId } = req.body;
    
    if (!sectionId || !trainerId) {
      return res.status(400).json({ error: 'Missing assignment parameters.' });
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found.' });
    }

    const trainer = await User.findOne({ _id: trainerId, role: 'Trainer' });
    if (!trainer) {
      return res.status(404).json({ error: 'Trainer not found or user role is mismatch.' });
    }

    section.trainerId = trainerId;
    await section.save();

    res.json({
      message: `Trainer ${trainer.fullName} linked to Section ${section.name} successfully.`,
      section
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * Trainer views their assigned section trainee payment compliance lists
 */
export async function getTrainerSectionCompliance(req, res) {
  try {
    // Find sections assigned to this trainer
    const sections = await Section.find({ trainerId: req.user.id });
    const list = [];

    for (const sec of sections) {
      const trainees = await Trainee.find({ sectionId: sec._id });
      
      const studentsInfo = [];
      for (const t of trainees) {
        const u = await User.findById(t.userId);
        const payments = await Payment.find({ traineeId: t._id });
        
        const pendingCount = payments.filter(p => p.status === 'Pending').length;
        const approvedCount = payments.filter(p => p.status === 'Approved').length;
        const totalPaid = payments.filter(p => p.status === 'Approved').reduce((acc, curr) => acc + curr.amountPaid, 0);

        studentsInfo.push({
          traineeId: t._id,
          fullName: u ? u.fullName : 'Unknown',
          rollNumber: t.rollNumber,
          telegramLinked: !!t.telegramChatId,
          approvedPaymentsCount: approvedCount,
          pendingVerificationCount: pendingCount,
          totalPaidETB: totalPaid,
          status: t.admissionStatus
        });
      }

      list.push({
        sectionId: sec._id,
        sectionName: sec.name,
        trainees: studentsInfo
      });
    }

    res.json({
      trainerId: req.user.id,
      sections: list
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Master Data CRUD shortcuts
export async function getDepartments(req, res) {
  res.json(await Department.find());
}
export async function createDepartment(req, res) {
  res.status(201).json(await Department.create(req.body));
}

export async function getOccupations(req, res) {
  res.json(await Occupation.find());
}
export async function createOccupation(req, res) {
  res.status(201).json(await Occupation.create(req.body));
}

export async function getPrograms(req, res) {
  res.json(await Program.find());
}
export async function createProgram(req, res) {
  res.status(201).json(await Program.create(req.body));
}

export async function getEntryYears(req, res) {
  res.json(await EntryYear.find());
}
export async function createEntryYear(req, res) {
  res.status(201).json(await EntryYear.create(req.body));
}

export async function getLevels(req, res) {
  res.json(await Level.find());
}
export async function createLevel(req, res) {
  res.status(201).json(await Level.create(req.body));
}

export async function getSections(req, res) {
  res.json(await Section.find());
}
export async function createSection(req, res) {
  res.status(201).json(await Section.create(req.body));
}

export async function getTrainers(req, res) {
  res.json(await User.find({ role: 'Trainer' }));
}

const setupController = {
  bootstrapSystem,
  registerTrainer,
  registerTrainee,
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
};

export default setupController;
