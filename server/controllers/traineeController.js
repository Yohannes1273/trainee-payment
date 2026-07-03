import Trainee from '../models/Trainee.js';
import User from '../models/User.js';
import Section from '../models/Section.js';
import Level from '../models/Level.js';
import EntryYear from '../models/EntryYear.js';
import Program from '../models/Program.js';
import Occupation from '../models/Occupation.js';
import Department from '../models/Department.js';
import Payment, { LEVEL_RATES } from '../models/Payment.js';
import LocalReceipt from '../models/LocalReceipt.js';
import penaltyService from '../services/penaltyService.js';
import paymentService from '../services/paymentService.js';

/**
 * Resolves the full relational academic hierarchy down to Section
 */
export async function resolveAcademicHierarchy(sectionId) {
  const info = {
    sectionName: 'N/A',
    levelNumber: 1,
    entryYear: 'N/A',
    programName: 'Regular',
    occupationName: 'N/A',
    departmentName: 'N/A'
  };

  if (!sectionId) return info;

  try {
    const section = await Section.findById(sectionId);
    if (!section) return info;
    info.sectionName = section.name;

    const level = await Level.findById(section.levelId);
    if (!level) return info;
    info.levelNumber = level.levelNumber;

    const entryYear = await EntryYear.findById(level.entryYearId);
    if (!entryYear) return info;
    info.entryYear = entryYear.year;

    const program = await Program.findById(entryYear.programId);
    if (!program) return info;
    info.programName = program.name;

    const occupation = await Occupation.findById(program.occupationId);
    if (!occupation) return info;
    info.occupationName = occupation.name;

    const department = await Department.findById(occupation.departmentId);
    if (!department) return info;
    info.departmentName = department.name;
  } catch (error) {
    console.error('Error resolving academic hierarchy:', error);
  }

  return info;
}

/**
 * Serves trainee financial profile and active ledger
 */
export async function getTraineeLedger(req, res) {
  try {
    // Locate student profile matching logged in User ID
    const trainee = await Trainee.findOne({ userId: req.user.id });
    if (!trainee) {
      return res.status(404).json({ error: 'Trainee profile not found.' });
    }

    const traineeUser = await User.findById(trainee.userId);
    const academic = await resolveAcademicHierarchy(trainee.sectionId);

    // Dynamic fee calculations
    let monthlyRate = 25; // Regular
    let blockMonths = 6;
    let requiredBlockPrice = 150;

    if (academic.programName === 'Extension' || academic.programName === 'Weekend') {
      monthlyRate = LEVEL_RATES[academic.levelNumber] || 175;
      blockMonths = 3;
      requiredBlockPrice = monthlyRate * blockMonths;
    } else if (academic.programName === 'Short Term') {
      monthlyRate = 3500;
      blockMonths = 1;
      requiredBlockPrice = 3500;
    }

    // Load actual payments submitted
    const payments = await Payment.find({ traineeId: trainee._id });
    
    // Enrich payments with local receipt numbers
    const enrichedPayments = [];
    let totalPaidAmount = 0;
    let totalPenaltyAmount = 0;

    for (const p of payments) {
      let receiptNumber = null;
      if (p.localReceiptId) {
        const r = await LocalReceipt.findById(p.localReceiptId);
        if (r) receiptNumber = r.receiptNumber;
      }
      
      if (p.status === 'Approved') {
        totalPaidAmount += p.amountPaid;
        totalPenaltyAmount += p.penaltyAmount;
      }

      enrichedPayments.push({
        ...p.toJSON(),
        receiptNumber
      });
    }

    // Mock a clean 4-block payment schedule structure for the current academic year
    // This gives students direct action items showing paid, pending or overdue status!
    const baseEntryYear = parseInt(academic.entryYear, 10) || 2026;
    const scheduleBlocks = [
      {
        blockIndex: 1,
        title: 'Block 1 Payment (Months 1-3)',
        dueDate: new Date(`${baseEntryYear}-02-15T00:00:00Z`),
        amountRequired: requiredBlockPrice,
      },
      {
        blockIndex: 2,
        title: 'Block 2 Payment (Months 4-6)',
        dueDate: new Date(`${baseEntryYear}-05-15T00:00:00Z`),
        amountRequired: requiredBlockPrice,
      },
      {
        blockIndex: 3,
        title: 'Block 3 Payment (Months 7-9)',
        dueDate: new Date(`${baseEntryYear}-08-15T00:00:00Z`),
        amountRequired: requiredBlockPrice,
      },
      {
        blockIndex: 4,
        title: 'Block 4 Payment (Months 10-12)',
        dueDate: new Date(`${baseEntryYear}-11-15T00:00:00Z`),
        amountRequired: requiredBlockPrice,
      }
    ];

    // For Regular Program, adjust schedules to be 6-month blocks
    if (academic.programName === 'Regular') {
      scheduleBlocks.splice(2, 2); // Only two 6-month blocks per year
      scheduleBlocks[0].title = 'Semiannual Block 1 (Months 1-6)';
      scheduleBlocks[0].dueDate = new Date(`${baseEntryYear}-04-15T00:00:00Z`);
      scheduleBlocks[0].amountRequired = 150;

      scheduleBlocks[1].title = 'Semiannual Block 2 (Months 7-12)';
      scheduleBlocks[1].dueDate = new Date(`${baseEntryYear}-10-15T00:00:00Z`);
      scheduleBlocks[1].amountRequired = 150;
    }

    // Map payment submissions onto the schedules to determine live outstanding state
    const now = new Date();
    const evaluatedSchedule = scheduleBlocks.map((block, index) => {
      // Find matching approved or pending payment for this block index
      const matchingPayment = enrichedPayments.find(p => p.amountPaid === block.amountRequired && p.status !== 'Rejected');
      
      let status = 'Unpaid';
      let paymentRecord = null;
      let lateDays = 0;
      let penaltyFee = 0;

      if (matchingPayment) {
        status = matchingPayment.status; // Approved or Pending
        paymentRecord = matchingPayment;
      } else {
        // Compute active overdue parameters if unpaid and due date has passed
        if (now > block.dueDate) {
          const calc = penaltyService.calculatePenalty(block.dueDate, now);
          lateDays = calc.daysLate;
          penaltyFee = calc.penaltyAmount;
          status = 'Overdue';
        }
      }

      return {
        ...block,
        status,
        paymentRecord,
        lateDays,
        penaltyFee
      };
    });

    res.json({
      trainee: {
        id: trainee._id,
        fullName: traineeUser ? traineeUser.fullName : 'N/A',
        email: traineeUser ? traineeUser.email : 'N/A',
        rollNumber: trainee.rollNumber,
        telegramChatId: trainee.telegramChatId,
        telegramAlertsEnabled: trainee.telegramAlertsEnabled !== false,
        admissionStatus: trainee.admissionStatus,
        profilePicture: traineeUser ? (traineeUser.profilePicture || null) : null
      },
      academic,
      financialConfig: {
        monthlyRate,
        blockMonths,
        requiredBlockPrice
      },
      ledgerSummary: {
        totalPaidAmount,
        totalPenaltyAmount,
        activeOverdueAmount: evaluatedSchedule.reduce((acc, curr) => acc + (curr.status === 'Overdue' ? curr.amountRequired : 0), 0),
        activePenaltyAmount: evaluatedSchedule.reduce((acc, curr) => acc + curr.penaltyFee, 0)
      },
      schedule: evaluatedSchedule,
      payments: enrichedPayments
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * requireTraineeAuth Middleware
 * 
 * Strict Data Isolation Guardrail: Ensures that the user is an authenticated Trainee,
 * and restricts database operations strictly to their own trainee credentials and records.
 */
export async function requireTraineeAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (req.user.role !== 'Trainee') {
    return res.status(403).json({ error: 'Access Denied: Only authenticated Trainees can access this module.' });
  }

  try {
    const trainee = await Trainee.findOne({ userId: req.user.id });
    if (!trainee) {
      return res.status(404).json({ error: 'Trainee profile not found in registration database.' });
    }

    // Attach verified trainee info to the request for data isolation
    req.trainee = trainee;
    req.traineeId = trainee._id.toString();

    // Prevent cross-user data exposure
    const parameterTraineeId = req.params.traineeId || req.query.traineeId || req.body.traineeId;
    if (parameterTraineeId && parameterTraineeId !== req.traineeId) {
      return res.status(403).json({ 
        error: 'Data Isolation Violation: You are not authorized to access financial data belonging to another student.' 
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: 'Error in Trainee Authorization middleware: ' + err.message });
  }
}

/**
 * GET /api/trainee/history
 * Fetches the logged-in student's complete historical payments with optional season, program, and year (level) filtering.
 */
export async function getTraineeHistory(req, res) {
  try {
    const { program, year } = req.query;
    
    // Scoping to req.traineeId is MANDATORY for data isolation
    const filter = { traineeId: req.traineeId };

    if (program) {
      filter.programName = program;
    }
    
    if (year) {
      filter.levelNumber = parseInt(year, 10);
    }

    const payments = await Payment.find(filter).sort({ paidDate: -1 });

    // Enrich payments with local receipt numbers where available
    const enrichedHistory = [];
    for (const p of payments) {
      let receiptNumber = null;
      if (p.localReceiptId) {
        const r = await LocalReceipt.findById(p.localReceiptId);
        if (r) receiptNumber = r.receiptNumber;
      }
      enrichedHistory.push({
        ...p.toJSON(),
        receiptNumber
      });
    }

    res.json({
      success: true,
      count: enrichedHistory.length,
      history: enrichedHistory
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/trainee/upload-slip
 * Allows the trainee to upload a payment receipt slip for their own account
 */
export async function traineeUploadSlip(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a bank payment receipt slip file.' });
    }

    const { programName, levelNumber, amountPaid, dueDate } = req.body;
    
    if (!programName || !levelNumber || !amountPaid || !dueDate) {
      return res.status(400).json({ error: 'Missing required financial properties: programName, levelNumber, amountPaid, dueDate.' });
    }

    const slipUrl = `/uploads/${req.file.filename}`;
    
    // Submit payment slip using the isolated traineeId
    const payment = await paymentService.submitPaymentSlip(req.traineeId, {
      programName,
      levelNumber: parseInt(levelNumber, 10),
      amountPaid: parseFloat(amountPaid),
      slipUrl,
      dueDate
    });

    // Auto-trigger Gemini AI verification asynchronously if available
    let aiMessage = '';
    try {
      const verified = await paymentService.verifyPayment(payment._id);
      aiMessage = ` Auto-verification completed with status: ${verified.status}.`;
    } catch (aiErr) {
      console.error('Asynchronous AI verification failed:', aiErr);
      aiMessage = ' Auto-verification scheduled for manual fallback review.';
    }

    res.status(201).json({
      success: true,
      message: `Bank payment slip submitted successfully.${aiMessage}`,
      payment
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * GET /api/trainee/penalty-simulation
 * Performs on-the-fly penalty calculation/simulation for the logged-in student's unpaid blocks
 */
export async function simulatePenalties(req, res) {
  try {
    const { dueDate } = req.query;
    if (!dueDate) {
      return res.status(400).json({ error: 'Please provide a dueDate query parameter to calculate late penalties.' });
    }

    const result = penaltyService.calculatePenalty(new Date(dueDate), new Date());
    res.json({
      success: true,
      simulation: {
        dueDate,
        currentDate: new Date(),
        daysLate: result.daysLate,
        penaltyAmount: result.penaltyAmount,
        ratePerDay: 10
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Allows a Trainee to update their Telegram chat id
 */
export async function updateTelegramChatId(req, res) {
  try {
    const { telegramChatId } = req.body;
    if (!telegramChatId) {
      return res.status(400).json({ error: 'Please enter a valid Telegram Chat ID.' });
    }

    const trainee = await Trainee.findOne({ userId: req.user.id });
    if (!trainee) {
      return res.status(404).json({ error: 'Trainee profile not found.' });
    }

    trainee.telegramChatId = telegramChatId;
    await trainee.save();

    res.json({
      message: 'Telegram Chat ID registered successfully. Ready to stream direct alerts!',
      trainee
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * Allows a Trainee to update their notification preferences
 */
export async function updateNotificationPreferences(req, res) {
  try {
    const { telegramAlertsEnabled } = req.body;
    if (telegramAlertsEnabled === undefined) {
      return res.status(400).json({ error: 'Please specify telegramAlertsEnabled preference.' });
    }

    const trainee = await Trainee.findOne({ userId: req.user.id });
    if (!trainee) {
      return res.status(404).json({ error: 'Trainee profile not found.' });
    }

    trainee.telegramAlertsEnabled = !!telegramAlertsEnabled;
    await trainee.save();

    res.json({
      message: `Notification preferences updated. Telegram alerts are now ${trainee.telegramAlertsEnabled ? 'enabled' : 'disabled'}.`,
      trainee
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

const traineeController = {
  requireTraineeAuth,
  getTraineeLedger,
  getTraineeHistory,
  traineeUploadSlip,
  simulatePenalties,
  updateTelegramChatId,
  updateNotificationPreferences
};

export default traineeController;
