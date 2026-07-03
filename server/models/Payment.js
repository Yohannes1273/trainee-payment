import mongoose, { Schema } from './db.js';
import softDeletePlugin from './softDeletePlugin.js';

const PaymentSchema = new Schema({
  traineeId: { type: String, required: true }, // FK to Trainee
  programName: { 
    type: String, 
    enum: ['Regular', 'Extension', 'Weekend', 'Short Term'], 
    required: true 
  },
  levelNumber: { type: Number, required: true }, // 1 to 5
  amountPaid: { type: Number, required: true }, // ETB amount
  monthsCovered: { type: Number, default: 0 }, // Dynamically calculated
  slipUrl: { type: String, required: true }, // Path to the uploaded bank receipt
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected', 'Auto-Verified', 'Flagged for Human Review'], 
    default: 'Pending' 
  },
  rejectionReason: { type: String, default: '' },
  localReceiptId: { type: String, default: null }, // FK to LocalReceipt

  // AI-Assisted Verification fields
  aiAmount: { type: Number, default: null },
  aiReferenceNumber: { type: String, default: '' },
  aiTransactionDate: { type: Date, default: null },
  aiConfidence: { type: String, default: null }, // 'high' or 'low'
  aiReason: { type: String, default: '' },
  
  // Dates
  dueDate: { type: Date, required: true }, // Payment block deadline
  paidDate: { type: Date, default: () => new Date() }, // When receipt was submitted
  verifiedDate: { type: Date, default: null }, // When finance verified
  verifiedBy: { type: String, default: null }, // User ID of finance verifier

  // Penalty tracking
  penaltyDaysLate: { type: Number, default: 0 },
  penaltyAmount: { type: Number, default: 0 }, // 10 ETB per late day
  trainerConfirmed: { type: Boolean, default: false }, // Physical verification confirmation by trainer
});

// Production indexing strategy for high-frequency queries and drill-downs
PaymentSchema.index({ traineeId: 1 });
PaymentSchema.index({ programName: 1 });
PaymentSchema.index({ levelNumber: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ localReceiptId: 1 });
PaymentSchema.index({ paidDate: -1 });

PaymentSchema.plugin(softDeletePlugin);

// Dynamic Rates config
export const LEVEL_RATES = {
  1: 175,
  2: 225,
  3: 300,
  4: 375,
  5: 450
};

// Pre-save validation script enforcing structural financial rules
PaymentSchema.pre('save', async function(next) {
  const amount = this.amountPaid;
  const program = this.programName;
  const level = this.levelNumber || 1;

  if (program === 'Regular') {
    // 25 ETB/month. Upfront 6-month block validation (150 ETB)
    const monthlyRate = 25;
    const blockMonths = 6;
    const requiredBlock = monthlyRate * blockMonths; // 150 ETB
    
    if (amount <= 0 || amount % requiredBlock !== 0) {
      return next(new Error(`Regular program payments must be made in upfront 6-month blocks (multiples of ${requiredBlock} ETB). Got: ${amount} ETB.`));
    }
    this.monthsCovered = (amount / requiredBlock) * blockMonths;

  } else if (program === 'Extension' || program === 'Weekend') {
    // Dynamic rate based on Level: 175 to 450 ETB/month. Upfront 3-month blocks.
    const monthlyRate = LEVEL_RATES[level] || 175;
    const blockMonths = 3;
    const requiredBlock = monthlyRate * blockMonths;
    
    if (amount <= 0 || amount % requiredBlock !== 0) {
      return next(new Error(`${program} program (Level ${level}) payments must be made in upfront 3-month blocks (multiples of ${requiredBlock} ETB based on ${monthlyRate} ETB/month). Got: ${amount} ETB.`));
    }
    this.monthsCovered = (amount / requiredBlock) * blockMonths;

  } else if (program === 'Short Term') {
    // Single flat fee >= 3500 ETB. Paid monthly or in single installment.
    const minAmount = 3500;
    if (amount < minAmount) {
      return next(new Error(`Short Term program payments must be a flat fee of at least ${minAmount} ETB. Got: ${amount} ETB.`));
    }
    this.monthsCovered = 1; // Flat coverage
  }

  next();
});

// Virtual Properties
PaymentSchema.virtual('remainingBalance').get(function() {
  let expectedAmount = 0;
  if (this.programName === 'Regular') {
    expectedAmount = 150; // 6 months @ 25 ETB
  } else if (this.programName === 'Extension' || this.programName === 'Weekend') {
    const monthlyRate = { 1: 175, 2: 225, 3: 300, 4: 375, 5: 450 }[this.levelNumber] || 175;
    expectedAmount = monthlyRate * 3; // 3 months block
  } else if (this.programName === 'Short Term') {
    expectedAmount = 3500;
  }
  const diff = expectedAmount - (this.amountPaid || 0);
  return diff > 0 ? diff : 0;
});

PaymentSchema.virtual('penaltyStatus').get(function() {
  if (this.penaltyAmount > 0) {
    return `Penalty Active: ${this.penaltyAmount} ETB Overdue (${this.penaltyDaysLate} Days Late)`;
  }
  if (this.status === 'Rejected') {
    return 'Rejected - Unsettled';
  }
  return 'No Overdue Penalties';
});

// Ensure virtuals are serialized in response objects
PaymentSchema.set('toJSON', { virtuals: true });
PaymentSchema.set('toObject', { virtuals: true });

const Payment = mongoose.model('Payment', PaymentSchema);
export default Payment;
