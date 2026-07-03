import mongoose, { Schema } from './db.js';

const AcademicHistorySchema = new Schema({
  traineeId: { type: Schema.Types.ObjectId, ref: 'Trainee', required: true },
  type: { type: String, enum: ['Promotion', 'Transfer'], required: true },
  fromLevel: { type: Number, default: null },
  toLevel: { type: Number, default: null },
  fromSectionId: { type: String, default: null },
  toSectionId: { type: String, default: null },
  dateOfTransfer: { type: Date, default: Date.now },
  registrarUserId: { type: String, required: true },
  reason: { type: String, default: '' }
}, {
  timestamps: true
});

const AcademicHistory = mongoose.model('AcademicHistory', AcademicHistorySchema);
export default AcademicHistory;
