import mongoose, { Schema } from './db.js';
import softDeletePlugin from './softDeletePlugin.js';

const TraineeSchema = new Schema({
  userId: { type: String, required: true }, // FK to User
  sectionId: { type: String, required: true }, // FK to Section
  telegramChatId: { type: String, default: '' }, // Telegram chat/user ID for chatbot alerts
  telegramAlertsEnabled: { type: Boolean, default: true }, // Whether real-time Telegram payment alerts are enabled
  rollNumber: { type: String, required: true }, // College identifier
  admissionStatus: { 
    type: String, 
    enum: ['Active', 'Suspended', 'Graduated'], 
    default: 'Active' 
  },
  level: { type: Number, default: 1 }, // Current level number
  entryYear: { type: String, default: '' }, // Current entry year, optionally updated
});

TraineeSchema.plugin(softDeletePlugin);

const Trainee = mongoose.model('Trainee', TraineeSchema);
export default Trainee;
