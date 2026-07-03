import mongoose, { Schema } from './db.js';
import softDeletePlugin from './softDeletePlugin.js';

const EntryYearSchema = new Schema({
  year: { type: String, required: true }, // e.g., "2024", "2025"
  programId: { type: String, required: true }, // FK to Program
});

EntryYearSchema.plugin(softDeletePlugin);

const EntryYear = mongoose.model('EntryYear', EntryYearSchema);
export default EntryYear;
