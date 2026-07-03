import Payment from '../models/Payment.js';
import Trainee from '../models/Trainee.js';
import User from '../models/User.js';
import LocalReceipt from '../models/LocalReceipt.js';
import paymentService from '../services/paymentService.js';
import penaltyService from '../services/penaltyService.js';

/**
 * requireTraineeAuth Middleware
 * 
 * Data Isolation Guardrail: Ensures that the user is a logged-in Trainee,
 * and restricts database interactions exclusively to their own trainee records.
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

    // Attach verified trainee info to the request
    req.trainee = trainee;
    req.traineeId = trainee._id.toString();

    // Data Isolation Guardrail: Check any explicitly passed traineeId parameter
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
    
    // Build filter securely - scoping to req.traineeId is MANDATORY
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

    // Auto-trigger Gemini AI verification asynchronously
    let aiMessage = '';
    try {
      const verified = await paymentService.verifyPayment(payment._id);
      aiMessage = ` Auto-verification finished with status: ${verified.status}.`;
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

const traineePaymentController = {
  requireTraineeAuth,
  getTraineeHistory,
  traineeUploadSlip,
  simulatePenalties
};

export default traineePaymentController;
