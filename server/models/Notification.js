import mongoose, { Schema } from './db.js';

const NotificationSchema = new Schema({
  userId: { type: String, default: null }, // Target user ID (null for global/role notifications)
  userRole: { type: String, default: null }, // Target role (e.g., 'Finance', 'Trainee', 'Night Controller', null for all)
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  readBy: { type: Array, default: [] }, // For global/role notifications, list of userIds who read it
  isRead: { type: Boolean, default: false }, // For user-specific notifications
  paymentId: { type: String, default: null }, // Optional link to a payment slip
  createdAt: { type: Date, default: () => new Date() }
});

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;
