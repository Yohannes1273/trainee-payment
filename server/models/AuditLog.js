import mongoose, { Schema } from './db.js';

const AuditLogSchema = new Schema({
  actionType: { 
    type: String, 
    required: true,
    enum: ['Report Generated', 'Trainer Announcement Sent', 'Login Attempt', 'Payment Verified', 'Payment Rejected']
  },
  performedBy: { type: String, required: true }, // User ID
  performedByName: { type: String, default: '' }, // Full name of user
  timestamp: { type: Date, default: () => new Date() },
  details: { type: Object, default: {} }, // Filters, status, section IDs, etc.
  targetUser: { type: String, default: null }, // Trainer user ID when announcement is sent
  targetEntity: { type: String, default: null }, // e.g., 'Payment', 'Section', 'Report'
  targetEntityId: { type: String, default: null }
});

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog;
