import Payment from '../models/Payment.js';

/**
 * Calculates late days and penalty amount for a payment
 * Rate: 10 ETB per late day
 */
export function calculatePenalty(dueDate, paidDate = new Date()) {
  const due = new Date(dueDate);
  const paid = new Date(paidDate);

  // If paid on or before due date, zero penalty
  if (paid <= due) {
    return { daysLate: 0, penaltyAmount: 0 };
  }

  // Calculate difference in days
  const timeDiff = Math.abs(paid.getTime() - due.getTime());
  const daysLate = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  const penaltyRate = 10; // 10 ETB per day
  const penaltyAmount = daysLate * penaltyRate;

  return { daysLate, penaltyAmount };
}

/**
 * Sweeps the database to update dynamic penalty balances for all unpaid/pending payments
 */
export async function updateAllPendingPenalties() {
  try {
    const pendingPayments = await Payment.find({ status: 'Pending' });
    const now = new Date();
    let updatedCount = 0;

    for (const payment of pendingPayments) {
      const { daysLate, penaltyAmount } = calculatePenalty(payment.dueDate, now);
      if (daysLate > 0 && (payment.penaltyDaysLate !== daysLate || payment.penaltyAmount !== penaltyAmount)) {
        payment.penaltyDaysLate = daysLate;
        payment.penaltyAmount = penaltyAmount;
        await payment.save();
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`[Penalty Service] Active sweep updated penalty balances for ${updatedCount} payments.`);
    }
  } catch (error) {
    console.error('[Penalty Service] Error running periodic penalty sweep:', error);
  }
}

const penaltyService = {
  calculatePenalty,
  updateAllPendingPenalties
};

export default penaltyService;
