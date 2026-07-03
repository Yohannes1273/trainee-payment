import mongoose, { Schema } from './db.js';
import softDeletePlugin from './softDeletePlugin.js';

const LocalReceiptSchema = new Schema({
  receiptNumber: { type: String, required: true }, // e.g. "REC-10001" or customized
  paymentId: { type: String, required: true }, // FK to Payment
  amount: { type: Number, required: true },
  routedTo: { 
    type: String, 
    enum: ['StaffQueue', 'NightControllerQueue'], 
    required: true 
  },
  audited: { type: Boolean, default: false },
  auditedBy: { type: String, default: null }, // Night Controller User ID
  auditedDate: { type: Date, default: null },
  notes: { type: String, default: '' },
});

LocalReceiptSchema.plugin(softDeletePlugin);

// Static method to generate next receipt sequence number
LocalReceiptSchema.statics.generateNextNumber = function() {
  const count = this.countDocuments();
  const nextNum = 10000 + count + 1;
  return `REC-${nextNum}`;
};

const LocalReceipt = mongoose.model('LocalReceipt', LocalReceiptSchema);
export default LocalReceipt;
