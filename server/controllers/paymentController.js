import path from 'path';
import fs from 'fs';
import multer from 'multer';
import Payment from '../models/Payment.js';
import Trainee from '../models/Trainee.js';
import User from '../models/User.js';
import LocalReceipt from '../models/LocalReceipt.js';
import Department from '../models/Department.js';
import Occupation from '../models/Occupation.js';
import Program from '../models/Program.js';
import EntryYear from '../models/EntryYear.js';
import Level from '../models/Level.js';
import Section from '../models/Section.js';
import AuditLog from '../models/AuditLog.js';
import botService from '../services/botService.js';
import paymentService from '../services/paymentService.js';

// Setup multer upload directory
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
    const safeName = `slip_${Date.now()}_${Math.random().toString(36).substr(2, 5)}${ext}`;
    cb(null, safeName);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    
    if (allowed.test(ext) || allowed.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG) or PDFs are accepted as valid receipt slips.'));
    }
  }
});

/**
 * Trainee submits a new payment block receipt
 */
export async function submitPayment(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a bank receipt slip file.' });
    }

    const { programName, levelNumber, amountPaid, dueDate } = req.body;
    
    // Validate inputs
    if (!programName || !levelNumber || !amountPaid || !dueDate) {
      return res.status(400).json({ error: 'Missing required financial block metrics or payment properties.' });
    }

    // Find trainee document linked to logged in user
    const trainee = await Trainee.findOne({ userId: req.user.id });
    if (!trainee) {
      return res.status(404).json({ error: 'Trainee profile was not found in collegiate registrar registry.' });
    }

    const slipUrl = `/uploads/${req.file.filename}`;
    
    const payment = await paymentService.submitPaymentSlip(trainee._id, {
      programName,
      levelNumber: parseInt(levelNumber, 10),
      amountPaid: parseFloat(amountPaid),
      slipUrl,
      dueDate
    });

    // Automatically trigger AI verification asynchronously
    let aiStatusInfo = '';
    try {
      const verifiedPayment = await paymentService.verifyPayment(payment._id);
      aiStatusInfo = ` AI verification complete. Status: ${verifiedPayment.status}.`;
    } catch (aiErr) {
      console.error('AI verification failed to execute:', aiErr);
      aiStatusInfo = ' AI verification failed to execute, flagged for manual review.';
    }

    res.status(201).json({
      message: `Bank payment slip submitted successfully. Verification workflow initiated.${aiStatusInfo}`,
      payment
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * Get all pending payment slips for verification queue (Finance)
 */
export async function getPendingPayments(req, res) {
  try {
    const payments = await Payment.find({ status: { $in: ['Pending', 'Auto-Verified', 'Flagged for Human Review'] } });
    
    // Resolve full metadata context
    const enriched = [];
    for (const p of payments) {
      const trainee = await Trainee.findById(p.traineeId);
      let studentName = 'Unknown student';
      let roll = 'N/A';
      
      if (trainee) {
        roll = trainee.rollNumber;
        const traineeUser = await User.findById(trainee.userId);
        if (traineeUser) {
          studentName = traineeUser.fullName;
        }
      }

      enriched.push({
        ...p.toJSON(),
        studentName,
        rollNumber: roll
      });
    }

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Verification action (Finance approves, rejects, or triggers AI verification for a payment slip)
 */
export async function verifyPayment(req, res) {
  try {
    const { paymentId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!status || !['Approved', 'Rejected', 'AI-Verify'].includes(status)) {
      return res.status(400).json({ error: 'Verification status must be "Approved", "Rejected", or "AI-Verify".' });
    }

    if (status === 'AI-Verify') {
      const result = await paymentService.verifyPayment(paymentId);
      return res.json({
        message: `Payment slip was successfully analyzed by Gemini AI and status set to "${result.status}".`,
        result
      });
    }

    if (status === 'Rejected' && !rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason notes are required to inform the trainee.' });
    }

    const result = await paymentService.verifyPaymentSlip(paymentId, status, rejectionReason, req.user.id);
    res.json({
      message: `Payment slip was successfully processed and set to ${status}.`,
      result
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * Night Controller queue endpoint (Extension/Weekend routed slips requiring physical audit)
 */
export async function getNightControllerQueue(req, res) {
  try {
    const receipts = await LocalReceipt.find({ routedTo: 'NightControllerQueue', audited: false });
    
    const enriched = [];
    for (const r of receipts) {
      const payment = await Payment.findById(r.paymentId);
      let studentName = 'Unknown student';
      let programName = 'Extension';
      let levelNumber = 1;
      let slipUrl = '';

      if (payment) {
        slipUrl = payment.slipUrl;
        programName = payment.programName;
        levelNumber = payment.levelNumber;
        const trainee = await Trainee.findById(payment.traineeId);
        if (trainee) {
          const traineeUser = await User.findById(trainee.userId);
          if (traineeUser) {
            studentName = traineeUser.fullName;
          }
        }
      }

      enriched.push({
        ...r.toJSON(),
        studentName,
        programName,
        levelNumber,
        slipUrl
      });
    }

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Night Controller completes receipt auditing
 */
export async function auditReceipt(req, res) {
  try {
    const { receiptId } = req.params;
    const { notes } = req.body;

    const auditedReceipt = await paymentService.auditNightControllerReceipt(receiptId, req.user.id, notes);
    res.json({
      message: 'Receipt audited and finalized successfully.',
      receipt: auditedReceipt
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * General Payment logs lookup
 */
export async function getPaymentLogs(req, res) {
  try {
    const payments = await Payment.find();
    const enriched = [];
    
    for (const p of payments) {
      const trainee = await Trainee.findById(p.traineeId);
      let studentName = 'Unknown student';
      if (trainee) {
        const u = await User.findById(trainee.userId);
        if (u) studentName = u.fullName;
      }

      let receiptNumber = 'Pending';
      if (p.localReceiptId) {
        const r = await LocalReceipt.findById(p.localReceiptId);
        if (r) receiptNumber = r.receiptNumber;
      }

      enriched.push({
        ...p.toJSON(),
        studentName,
        receiptNumber
      });
    }

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Robust aggregation endpoint to compute total paid amounts traversing Department -> Payment path
 * and grouping dynamically by section/level/occupation/department.
 */
export async function getAggregationSummary(req, res) {
  try {
    const departments = await Department.find({});
    const occupations = await Occupation.find({});
    const programs = await Program.find({});
    const entryYears = await EntryYear.find({});
    const levels = await Level.find({});
    const sections = await Section.find({});
    const trainees = await Trainee.find({});
    const payments = await Payment.find({});
    const users = await User.find({});

    const summary = [];

    for (const dept of departments) {
      const deptOccs = occupations.filter(o => o.departmentId === dept._id);
      for (const occ of deptOccs) {
        const occProgs = programs.filter(p => p.occupationId === occ._id);
        for (const prog of occProgs) {
          const progYears = entryYears.filter(y => y.programId === prog._id);
          for (const yr of progYears) {
            const yrLvls = levels.filter(l => l.entryYearId === yr._id);
            for (const lvl of yrLvls) {
              const lvlSecs = sections.filter(s => s.levelId === lvl._id);
              for (const sec of lvlSecs) {
                const secTrainees = trainees.filter(t => t.sectionId === sec._id);
                const trainerUser = users.find(u => u._id === sec.trainerId);

                let totalPaid = 0;
                const paidTraineeIds = new Set();

                for (const trainee of secTrainees) {
                  const traineePayments = payments.filter(
                    p => p.traineeId === trainee._id && p.status === 'Approved'
                  );
                  const traineeTotalPaid = traineePayments.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
                  totalPaid += traineeTotalPaid;
                  if (traineePayments.length > 0) {
                    paidTraineeIds.add(trainee._id);
                  }
                }

                summary.push({
                  departmentId: dept._id,
                  departmentName: dept.name,
                  occupationId: occ._id,
                  occupationName: occ.name,
                  programId: prog._id,
                  programName: prog.name,
                  entryYearId: yr._id,
                  entryYear: yr.year,
                  levelId: lvl._id,
                  levelNumber: lvl.levelNumber,
                  sectionId: sec._id,
                  sectionName: sec.name,
                  trainerId: sec.trainerId || null,
                  trainerName: trainerUser ? trainerUser.fullName : 'None Assigned',
                  totalTrainees: secTrainees.length,
                  activeTrainees: secTrainees.filter(t => t.admissionStatus === 'Active').length,
                  totalPaidAmount: totalPaid,
                  paidTraineesCount: paidTraineeIds.size,
                  complianceRate: secTrainees.length > 0 
                    ? `${Math.round((paidTraineeIds.size / secTrainees.length) * 100)}%`
                    : '0%'
                });
              }
            }
          }
        }
      }
    }

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Triggers Telegram direct notification to Section Trainer with section's financial status
 * Enforces a 2-minute anti-spam guard limit logged inside AuditLog.
 */
export async function triggerTrainerAnnouncement(req, res) {
  try {
    const { sectionId } = req.body;
    if (!sectionId) {
      return res.status(400).json({ error: 'Academic section ID is required to trigger notification.' });
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Academic Section was not found.' });
    }

    if (!section.trainerId) {
      return res.status(400).json({ error: 'No Trainer is currently assigned to this section.' });
    }

    const trainerUser = await User.findById(section.trainerId);
    if (!trainerUser) {
      return res.status(404).json({ error: 'Assigned Trainer user account not found.' });
    }

    // Check anti-spam in AuditLog: max 1 notification per trainer per 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentLogs = await AuditLog.find({
      actionType: 'Trainer Announcement Sent',
      targetUser: section.trainerId,
      timestamp: { $gte: twoMinutesAgo }
    });

    if (recentLogs.length > 0) {
      return res.status(429).json({ 
        error: 'Anti-Spam Block: A compliance notification was recently sent to this Trainer. Please try again later.' 
      });
    }

    const departments = await Department.find({});
    const occupations = await Occupation.find({});
    const programs = await Program.find({});
    const entryYears = await EntryYear.find({});
    const levels = await Level.find({});
    const trainees = await Trainee.find({ sectionId });
    const payments = await Payment.find({});

    const lvl = levels.find(l => l._id === section.levelId);
    const yr = lvl ? entryYears.find(y => y._id === lvl.entryYearId) : null;
    const prog = yr ? programs.find(p => p._id === yr.programId) : null;
    const occ = prog ? occupations.find(o => o._id === prog.occupationId) : null;
    const dept = occ ? departments.find(d => d._id === occ.departmentId) : null;

    let totalPaid = 0;
    const paidTraineeIds = new Set();

    for (const trainee of trainees) {
      const traineePayments = payments.filter(
        p => p.traineeId === trainee._id && p.status === 'Approved'
      );
      totalPaid += traineePayments.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
      if (traineePayments.length > 0) {
        paidTraineeIds.add(trainee._id);
      }
    }

    const summaryData = {
      departmentName: dept ? dept.name : 'N/A',
      occupationName: occ ? occ.name : 'N/A',
      programName: prog ? prog.name : 'N/A',
      entryYear: yr ? yr.year : 'N/A',
      levelNumber: lvl ? lvl.levelNumber : 1,
      sectionName: section.name,
      trainerName: trainerUser.fullName,
      totalTrainees: trainees.length,
      activeTrainees: trainees.filter(t => t.admissionStatus === 'Active').length,
      totalPaidAmount: totalPaid,
      paidTraineesCount: paidTraineeIds.size,
      complianceRate: trainees.length > 0 
        ? `${Math.round((paidTraineeIds.size / trainees.length) * 100)}%`
        : '0%'
    };

    // Trainer's Telegram chat id mock lookup
    const trainerChatId = trainerUser.username === 'trainer1' ? '123456789' : '987654321';

    // Dispatch notification
    const botSuccess = await botService.announceToTrainer(trainerChatId, summaryData);

    // Write audit log trace
    await AuditLog.create({
      actionType: 'Trainer Announcement Sent',
      performedBy: req.user.id,
      performedByName: req.user.fullName || 'System',
      targetUser: section.trainerId,
      targetEntity: 'Section',
      targetEntityId: sectionId,
      details: {
        trainerChatId,
        complianceRate: summaryData.complianceRate,
        totalPaidAmount: summaryData.totalPaidAmount,
        delivered: !!botSuccess
      }
    });

    res.json({
      message: `Financial compliance report dispatched successfully to Trainer ${trainerUser.fullName}.`,
      summaryData,
      botSuccess
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Search and filter payments dynamically by multiple criteria
 */
export async function searchPayments(req, res) {
  try {
    const { 
      receiptNumber, 
      studentName, 
      level, 
      section, 
      entryYear, 
      program, 
      occupation, 
      department 
    } = req.query;

    // Load full relational database
    const departments = await Department.find({});
    const occupations = await Occupation.find({});
    const programs = await Program.find({});
    const entryYears = await EntryYear.find({});
    const levels = await Level.find({});
    const sections = await Section.find({});
    const trainees = await Trainee.find({});
    const users = await User.find({});
    const localReceipts = await LocalReceipt.find({});
    const payments = await Payment.find({});

    // Filter trainees based on hierarchy and user-info
    let filteredTrainees = [...trainees];

    // Filter by studentName
    if (studentName) {
      const regex = new RegExp(studentName, 'i');
      const matchedUsers = users.filter(u => regex.test(u.fullName || ''));
      const matchedUserIds = matchedUsers.map(u => u._id);
      filteredTrainees = filteredTrainees.filter(t => matchedUserIds.includes(t.userId));
    }

    // Filter by department (Department ID)
    if (department) {
      const occIds = occupations.filter(o => o.departmentId === department).map(o => o._id);
      const progIds = programs.filter(p => occIds.includes(p.occupationId)).map(p => p._id);
      const eyIds = entryYears.filter(e => progIds.includes(e.programId)).map(e => e._id);
      const lvlIds = levels.filter(l => eyIds.includes(l.entryYearId)).map(l => l._id);
      const secIds = sections.filter(s => lvlIds.includes(s.levelId)).map(s => s._id);
      filteredTrainees = filteredTrainees.filter(t => secIds.includes(t.sectionId));
    }

    // Filter by occupation (Occupation ID)
    if (occupation) {
      const progIds = programs.filter(p => p.occupationId === occupation).map(p => p._id);
      const eyIds = entryYears.filter(e => progIds.includes(e.programId)).map(e => e._id);
      const lvlIds = levels.filter(l => eyIds.includes(l.entryYearId)).map(l => l._id);
      const secIds = sections.filter(s => lvlIds.includes(s.levelId)).map(s => s._id);
      filteredTrainees = filteredTrainees.filter(t => secIds.includes(t.sectionId));
    }

    // Filter by program (Program ID or name)
    if (program) {
      const isId = programs.some(p => p._id === program);
      let progIds = [];
      if (isId) {
        progIds = [program];
      } else {
        progIds = programs.filter(p => p.name === program).map(p => p._id);
      }
      const eyIds = entryYears.filter(e => progIds.includes(e.programId)).map(e => e._id);
      const lvlIds = levels.filter(l => eyIds.includes(l.entryYearId)).map(l => l._id);
      const secIds = sections.filter(s => lvlIds.includes(s.levelId)).map(s => s._id);
      filteredTrainees = filteredTrainees.filter(t => secIds.includes(t.sectionId));
    }

    // Filter by entryYear (EntryYear ID or year value)
    if (entryYear) {
      const isId = entryYears.some(e => e._id === entryYear);
      let eyIds = [];
      if (isId) {
        eyIds = [entryYear];
      } else {
        eyIds = entryYears.filter(e => e.year === parseInt(entryYear, 10)).map(e => e._id);
      }
      const lvlIds = levels.filter(l => eyIds.includes(l.entryYearId)).map(l => l._id);
      const secIds = sections.filter(s => lvlIds.includes(s.levelId)).map(s => s._id);
      filteredTrainees = filteredTrainees.filter(t => secIds.includes(t.sectionId));
    }

    // Filter by level (Level ID or levelNumber)
    if (level) {
      const isId = levels.some(l => l._id === level);
      let lvlIds = [];
      if (isId) {
        lvlIds = [level];
      } else {
        lvlIds = levels.filter(l => l.levelNumber === parseInt(level, 10)).map(l => l._id);
      }
      const secIds = sections.filter(s => lvlIds.includes(s.levelId)).map(s => s._id);
      filteredTrainees = filteredTrainees.filter(t => secIds.includes(t.sectionId));
    }

    // Filter by section (Section ID)
    if (section) {
      filteredTrainees = filteredTrainees.filter(t => t.sectionId === section);
    }

    const filteredTraineeIds = filteredTrainees.map(t => t._id);

    // Now filter payments
    let matchedPayments = payments.filter(p => filteredTraineeIds.includes(p.traineeId));

    // Filter by receiptNumber (regex case-insensitive on local receipts or AI reference number)
    if (receiptNumber) {
      const regex = new RegExp(receiptNumber, 'i');
      const matchingReceipts = localReceipts.filter(r => regex.test(r.receiptNumber || ''));
      const matchingPaymentIds = matchingReceipts.map(r => r.paymentId);
      
      matchedPayments = matchedPayments.filter(p => 
        matchingPaymentIds.includes(p._id) || regex.test(p.aiReferenceNumber || '')
      );
    }

    // Enrich matched payments with hierarchy details
    const enrichedPayments = matchedPayments.map(p => {
      const trainee = trainees.find(t => t._id === p.traineeId);
      const user = trainee ? users.find(u => u._id === trainee.userId) : null;
      const sectionObj = trainee ? sections.find(s => s._id === trainee.sectionId) : null;
      const levelObj = sectionObj ? levels.find(l => l._id === sectionObj.levelId) : null;
      const entryObj = levelObj ? entryYears.find(e => e._id === levelObj.entryYearId) : null;
      const programObj = entryObj ? programs.find(pr => pr._id === entryObj.programId) : null;
      const occupationObj = programObj ? occupations.find(o => o._id === programObj.occupationId) : null;
      const departmentObj = occupationObj ? departments.find(d => d._id === occupationObj.departmentId) : null;
      
      const receiptObj = localReceipts.find(r => r.paymentId === p._id);

      return {
        ...p.toJSON(),
        studentName: user ? user.fullName : 'Unknown Student',
        rollNumber: trainee ? trainee.rollNumber : 'N/A',
        sectionName: sectionObj ? sectionObj.name : 'N/A',
        levelNumber: levelObj ? levelObj.levelNumber : p.levelNumber,
        entryYear: entryObj ? entryObj.year : 'N/A',
        programName: programObj ? programObj.name : p.programName,
        occupationName: occupationObj ? occupationObj.name : 'N/A',
        departmentName: departmentObj ? departmentObj.name : 'N/A',
        receiptNumber: receiptObj ? receiptObj.receiptNumber : (p.aiReferenceNumber || 'N/A')
      };
    });

    // Sort by paidDate desc
    enrichedPayments.sort((a, b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime());

    res.json(enrichedPayments);
  } catch (error) {
    console.error('Error searching payments:', error);
    res.status(500).json({ error: error.message });
  }
}

const paymentController = {
  submitPayment,
  getPendingPayments,
  verifyPayment,
  getNightControllerQueue,
  auditReceipt,
  getPaymentLogs,
  getAggregationSummary,
  triggerTrainerAnnouncement,
  searchPayments,
  upload
};

export default paymentController;
