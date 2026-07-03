import mongoose, { Schema } from './db.js';
import softDeletePlugin from './softDeletePlugin.js';

const LevelSchema = new Schema({
  levelNumber: { type: Number, required: true }, // 1, 2, 3, 4, 5
  entryYearId: { type: String, required: true }, // FK to EntryYear
});

LevelSchema.plugin(softDeletePlugin);

const Level = mongoose.model('Level', LevelSchema);
export default Level;
