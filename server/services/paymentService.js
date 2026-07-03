import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from "@google/genai";
import Payment from '../models/Payment.js';
import Trainee from '../models/Trainee.js';
import User from '../models/User.js';
import LocalReceipt from '../models/LocalReceipt.js';
import botService from './botService.js';
import penaltyService from './penaltyService.js';
import telegramTriggerService from './telegramTriggerService.js';
import notificationService from './notificationService.js';

/**
 * Submits a new payment slip for a trainee
 */
export async function submitPaymentSlip(traineeId, paymentData) {
  const { programName, levelNumber, amountPaid, slipUrl, dueDate } = paymentData;
  
  const trainee = await Trainee.findById(traineeId);
  if (!trainee) {
    throw new Error('Trainee not found.');
  }

  const traineeUser = await User.findById(trainee.userId);
  const traineeName = traineeUser ? traineeUser.fullName : 'Trainee';

  // Create payment (pre-save validation will auto-verify financial block rules)
  const payment = await Payment.create({
    traineeId,
    programName,
    levelNumber,
    amountPaid,
    slipUrl,
    dueDate: new Date(dueDate),
    paidDate: new Date(),
    status: 'Pending'
  });

  // Calculate early late penalty (unapproved status showing estimation)
  const penalty = penaltyService.calculatePenalty(payment.dueDate, payment.paidDate);
  payment.penaltyDaysLate = penalty.daysLate;
  payment.penaltyAmount = penalty.penaltyAmount;
  await payment.save();

  // Trigger dynamic Telegram notifications via the telegramTriggerService
  const triggerVariables = {
    traineeName,
    rollNumber: trainee.rollNumber,
    programName,
    levelNumber,
    amountPaid,
    dueDate: new Date(dueDate).toLocaleDateString(),
    penaltyAmount: payment.penaltyAmount
  };
  await telegramTriggerService.triggerNotification(
    'submit_slip',
    triggerVariables,
    trainee.telegramChatId,
    trainee.telegramAlertsEnabled !== false
  );

  // Trigger in-app notifications for Finance and Night Controller roles
  try {
    await notificationService.sendNotification({
      userRole: 'Finance',
      title: 'New Bank Slip Submitted',
      message: `Trainee ${traineeName} (Roll: ${trainee.rollNumber}) submitted ${amountPaid} ETB for ${programName}.`,
      type: 'info',
      paymentId: payment._id
    });
    await notificationService.sendNotification({
      userRole: 'Night Controller',
      title: 'New Bank Slip Submitted',
      message: `Trainee ${traineeName} (Roll: ${trainee.rollNumber}) submitted ${amountPaid} ETB for ${programName}.`,
      type: 'info',
      paymentId: payment._id
    });
  } catch (err) {
    console.error('Failed to dispatch in-app notifications:', err);
  }

  return payment;
}

/**
 * Verifies a pending payment slip (Approves or Rejects)
 */
export async function verifyPaymentSlip(paymentId, status, rejectionReason = '', verifiedByUserId) {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new Error('Payment not found.');
  }
  if (!['Pending', 'Auto-Verified', 'Flagged for Human Review'].includes(payment.status)) {
    throw new Error('Payment has already been processed.');
  }

  const trainee = await Trainee.findById(payment.traineeId);
  if (!trainee) {
    throw new Error('Associated trainee not found.');
  }

  const traineeUser = await User.findById(trainee.userId);
  const traineeName = traineeUser ? traineeUser.fullName : 'Trainee';

  const verifier = await User.findById(verifiedByUserId);
  const verifierName = verifier ? verifier.fullName : 'Finance Officer';

  if (status === 'Rejected') {
    payment.status = 'Rejected';
    payment.rejectionReason = rejectionReason;
    payment.verifiedDate = new Date();
    payment.verifiedBy = verifiedByUserId;
    await payment.save();

    // Trigger dynamic Telegram notifications via the telegramTriggerService for Rejections
    const triggerVariables = {
      traineeName,
      amountPaid: payment.amountPaid,
      rejectionReason
    };
    await telegramTriggerService.triggerNotification(
      'reject_payment',
      triggerVariables,
      trainee.telegramChatId,
      trainee.telegramAlertsEnabled !== false
    );

    // Trigger in-app notification for Trainee
    try {
      if (trainee.userId) {
        await notificationService.sendNotification({
          userId: trainee.userId,
          title: 'Payment Slip Rejected',
          message: `Your payment of ${payment.amountPaid} ETB for ${payment.programName} was rejected. Reason: ${rejectionReason}`,
          type: 'error',
          paymentId: payment._id
        });
      }
    } catch (err) {
      console.error('Failed to dispatch in-app notification for rejection:', err);
    }
    
    return payment;
  }

  if (status === 'Approved') {
    payment.status = 'Approved';
    payment.verifiedDate = new Date();
    payment.verifiedBy = verifiedByUserId;
    
    // Finalize penalty on actual receipt verification
    const penalty = penaltyService.calculatePenalty(payment.dueDate, payment.paidDate);
    payment.penaltyDaysLate = penalty.daysLate;
    payment.penaltyAmount = penalty.penaltyAmount;

    // Generate unique local receipt sequence
    const receiptNumber = LocalReceipt.generateNextNumber();
    
    // Financial Routing Rule:
    // - Extension / Weekend ➡️ Night Controller Queue
    // - Regular ➡️ Regular Staff Queue
    const routedTo = (payment.programName === 'Extension' || payment.programName === 'Weekend')
      ? 'NightControllerQueue'
      : 'StaffQueue';

    const localReceipt = await LocalReceipt.create({
      receiptNumber,
      paymentId: payment._id,
      amount: payment.amountPaid,
      routedTo,
      audited: false
    });

    payment.localReceiptId = localReceipt._id;
    await payment.save();

    // Trigger dynamic Telegram notifications via the telegramTriggerService for Approvals
    const triggerVariables = {
      traineeName,
      receiptNumber,
      amountPaid: payment.amountPaid,
      penaltyAmount: payment.penaltyAmount,
      routedTo: routedTo === 'NightControllerQueue' ? 'Night Controller Stream' : 'Staff Verification Queue'
    };
    await telegramTriggerService.triggerNotification(
      'approve_payment',
      triggerVariables,
      trainee.telegramChatId,
      trainee.telegramAlertsEnabled !== false
    );

    // Trigger in-app notification for Trainee
    try {
      if (trainee.userId) {
        await notificationService.sendNotification({
          userId: trainee.userId,
          title: 'Payment Slip Approved! ✅',
          message: `Your payment of ${payment.amountPaid} ETB for ${payment.programName} has been approved. Receipt No: ${receiptNumber}.`,
          type: 'success',
          paymentId: payment._id
        });
      }
    } catch (err) {
      console.error('Failed to dispatch in-app notification for approval:', err);
    }

    return { payment, localReceipt };
  }

  throw new Error('Invalid verification status.');
}

/**
 * Audits a receipt in the Night Controller workflow stream
 */
export async function auditNightControllerReceipt(receiptId, auditedByUserId, notes = '') {
  const receipt = await LocalReceipt.findById(receiptId);
  if (!receipt) {
    throw new Error('Receipt not found.');
  }
  if (receipt.routedTo !== 'NightControllerQueue') {
    throw new Error('Receipt is not routed to the Night Controller stream.');
  }

  receipt.audited = true;
  receipt.auditedBy = auditedByUserId;
  receipt.auditedDate = new Date();
  receipt.notes = notes;
  await receipt.save();

  // Find corresponding payment and trainee to notify of final completion
  const payment = await Payment.findById(receipt.paymentId);
  if (payment) {
    const trainee = await Trainee.findById(payment.traineeId);
    if (trainee && trainee.telegramChatId && trainee.telegramAlertsEnabled !== false) {
      const traineeUser = await User.findById(trainee.userId);
      const name = traineeUser ? traineeUser.fullName : 'Trainee';
      const auditMsg = `🔒 <b>Audit Finalized</b>\n` +
        `Hello <b>${name}</b>, your Extension/Weekend receipt <b>${receipt.receiptNumber}</b> has been audited and permanently archived.`;
      await botService.sendDirectMessage(trainee.telegramChatId, auditMsg);
    }
  }

  return receipt;
}

let aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

/**
 * Automates the verification of bank slip images using Gemini 3.5 Flash
 */
export async function verifySlipWithAI(imageBuffer) {
  const ai = getGeminiClient();
  
  const imagePart = {
    inlineData: {
      mimeType: "image/png",
      data: imageBuffer.toString("base64"),
    },
  };

  const promptString = 
    "Analyze this bank deposit slip and extract the transaction details. " +
    "You must return the extracted details strictly matching the schema: " +
    "amount, referenceNumber, transactionDate, confidence, and reason. " +
    "Make sure transactionDate is formatted as 'YYYY-MM-DD'. " +
    "confidence must be 'high' if you can clearly read the amount, reference/transaction number, and date, otherwise 'low'. " +
    "In the reason, detail any findings, why confidence might be low, or list the extracted fields.";

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: { parts: [imagePart, { text: promptString }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          amount: { 
            type: Type.NUMBER, 
            description: "The verified transfer/payment amount in ETB. Must be a clean number without currency signs." 
          },
          referenceNumber: { 
            type: Type.STRING, 
            description: "The bank reference, transaction ID, or journal number." 
          },
          transactionDate: { 
            type: Type.STRING, 
            description: "The date of the transaction (YYYY-MM-DD)." 
          },
          confidence: { 
            type: Type.STRING, 
            description: "Confidence level: 'high' or 'low'" 
          },
          reason: { 
            type: Type.STRING, 
            description: "Brief reason for confidence classification or extraction summary." 
          }
        },
        required: ["amount", "referenceNumber", "transactionDate", "confidence", "reason"]
      }
    }
  });

  if (!response.text) {
    throw new Error("No response text received from Gemini AI.");
  }

  const parsedData = JSON.parse(response.text.trim());
  return parsedData;
}

/**
 * Automatically triggers AI verification on a submitted payment
 */
export async function verifyPayment(paymentId) {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new Error('Payment not found.');
  }

  const trainee = await Trainee.findById(payment.traineeId);
  if (!trainee) {
    throw new Error('Associated trainee not found.');
  }

  const filePath = path.join(process.cwd(), 'public', payment.slipUrl);
  if (!fs.existsSync(filePath)) {
    payment.status = 'Flagged for Human Review';
    payment.aiConfidence = 'low';
    payment.aiReason = 'Payment slip file could not be found on disk.';
    await payment.save();
    return payment;
  }

  let imageBuffer;
  try {
    imageBuffer = await fs.promises.readFile(filePath);
  } catch (err) {
    payment.status = 'Flagged for Human Review';
    payment.aiConfidence = 'low';
    payment.aiReason = `Failed to read slip file from disk: ${err.message}`;
    await payment.save();
    return payment;
  }

  try {
    const aiResult = await verifySlipWithAI(imageBuffer);

    payment.aiAmount = aiResult.amount || 0;
    payment.aiReferenceNumber = aiResult.referenceNumber || 'N/A';
    
    if (aiResult.transactionDate) {
      const parsedDate = new Date(aiResult.transactionDate);
      payment.aiTransactionDate = isNaN(parsedDate.getTime()) ? null : parsedDate;
    } else {
      payment.aiTransactionDate = null;
    }
    
    payment.aiConfidence = aiResult.confidence || 'low';
    payment.aiReason = aiResult.reason || '';

    // Comparison logic
    const isAmountMatch = Math.abs((aiResult.amount || 0) - payment.amountPaid) < 0.01;
    const isHighConfidence = (aiResult.confidence || '').toLowerCase() === 'high';

    if (isHighConfidence && isAmountMatch) {
      payment.status = 'Auto-Verified';
      payment.verifiedDate = new Date();
      payment.verifiedBy = 'Gemini AI Engine';

      // Generate local receipt
      const receiptNumber = LocalReceipt.generateNextNumber();
      const routedTo = (payment.programName === 'Extension' || payment.programName === 'Weekend')
        ? 'NightControllerQueue'
        : 'StaffQueue';

      const localReceipt = await LocalReceipt.create({
        receiptNumber,
        paymentId: payment._id,
        amount: payment.amountPaid,
        routedTo,
        audited: false
      });

      payment.localReceiptId = localReceipt._id;
      
      const traineeUser = await User.findById(trainee.userId);
      const traineeName = traineeUser ? traineeUser.fullName : 'Trainee';

      // Trigger dynamic Telegram notifications via the telegramTriggerService for Auto-Verifications
      const triggerVariables = {
        traineeName,
        receiptNumber,
        amountPaid: payment.amountPaid,
        penaltyAmount: payment.penaltyAmount,
        routedTo: routedTo === 'NightControllerQueue' ? 'Night Controller Stream' : 'Staff Verification Queue',
        aiReferenceNumber: payment.aiReferenceNumber
      };
      await telegramTriggerService.triggerNotification(
        'auto_verify',
        triggerVariables,
        trainee.telegramChatId,
        trainee.telegramAlertsEnabled !== false
      );

      // Trigger in-app notification for Trainee
      try {
        if (trainee.userId) {
          await notificationService.sendNotification({
            userId: trainee.userId,
            title: 'Payment Auto-Verified ✨',
            message: `Your payment of ${payment.amountPaid} ETB for ${payment.programName} was auto-verified by Gemini AI (Receipt: ${receiptNumber}).`,
            type: 'success',
            paymentId: payment._id
          });
        }
      } catch (err) {
        console.error('Failed to dispatch in-app notification for auto-verify:', err);
      }

    } else {
      payment.status = 'Flagged for Human Review';
      let mismatchMsg = '';
      if (!isAmountMatch) {
        mismatchMsg = `Amount Mismatch: Student claimed ${payment.amountPaid} ETB, but Gemini AI extracted ${aiResult.amount} ETB.`;
      } else {
        mismatchMsg = `AI had low confidence extracting payment details.`;
      }
      payment.aiReason = `${mismatchMsg} ${aiResult.reason || ''}`.trim();

      const traineeUser = await User.findById(trainee.userId);
      const traineeName = traineeUser ? traineeUser.fullName : 'Trainee';
      
      // Trigger dynamic Telegram notifications via the telegramTriggerService for Review Flagging
      const triggerVariables = {
        traineeName,
        amountPaid: payment.amountPaid,
        aiReason: payment.aiReason
      };
      await telegramTriggerService.triggerNotification(
        'flag_review',
        triggerVariables,
        trainee.telegramChatId,
        trainee.telegramAlertsEnabled !== false
      );

      // Trigger in-app notification for Finance / Night Controller
      try {
        await notificationService.sendNotification({
          userRole: 'Finance',
          title: 'Payment Flagged for Review ⚠️',
          message: `Trainee ${traineeName}'s payment of ${payment.amountPaid} ETB was flagged for human review: ${payment.aiReason}`,
          type: 'warning',
          paymentId: payment._id
        });
        await notificationService.sendNotification({
          userRole: 'Night Controller',
          title: 'Payment Flagged for Review ⚠️',
          message: `Trainee ${traineeName}'s payment of ${payment.amountPaid} ETB was flagged for human review: ${payment.aiReason}`,
          type: 'warning',
          paymentId: payment._id
        });
      } catch (err) {
        console.error('Failed to dispatch in-app notification for flagged review:', err);
      }
    }

    await payment.save();
    return payment;

  } catch (error) {
    payment.status = 'Flagged for Human Review';
    payment.aiConfidence = 'low';
    payment.aiReason = `AI Engine Processing Error: ${error.message}`;
    await payment.save();
    return payment;
  }
}

/**
 * Aggregates payments by program and date for NLP bot integration
 */
export async function aggregateCollectionByProgramAndDate(programName, dateInput) {
  // Parse dateInput
  const targetDate = new Date(dateInput);
  if (isNaN(targetDate.getTime())) {
    throw new Error('Invalid date specified.');
  }

  const payments = await Payment.find({});
  
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  const targetDay = targetDate.getDate();

  const filtered = payments.filter(p => {
    const pProg = (p.programName || '').trim().toLowerCase();
    const queryProg = (programName || '').trim().toLowerCase();
    if (pProg !== queryProg) return false;

    if (!p.paidDate) return false;
    const pDate = new Date(p.paidDate);
    return pDate.getFullYear() === targetYear &&
           pDate.getMonth() === targetMonth &&
           pDate.getDate() === targetDay;
  });

  const totalCollected = filtered
    .filter(p => ['Approved', 'Auto-Verified'].includes(p.status))
    .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

  const pendingAmount = filtered
    .filter(p => p.status === 'Pending')
    .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

  const totalTransactions = filtered.length;

  return {
    program: programName,
    date: targetDate.toISOString().split('T')[0],
    totalCollected,
    pendingAmount,
    totalTransactions,
    transactionsCount: filtered.length
  };
}

const paymentService = {
  submitPaymentSlip,
  verifyPaymentSlip,
  auditNightControllerReceipt,
  verifySlipWithAI,
  verifyPayment,
  aggregateCollectionByProgramAndDate
};

export default paymentService;
