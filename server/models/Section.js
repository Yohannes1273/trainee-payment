import mongoose, { Schema } from './db.js';
import softDeletePlugin from './softDeletePlugin.js';

const SectionSchema = new Schema({
  name: { type: String, required: true }, // e.g., "A", "B", "C"
  levelId: { type: String, required: true }, // FK to Level
  trainerId: { type: String, default: null }, // Trainer user assigned to this section
  maxCapacity: { type: Number, default: 30 }, // Maximum trainees allowed in this section
});

SectionSchema.plugin(softDeletePlugin);

const Section = mongoose.model('Section', SectionSchema);
export default Section;
