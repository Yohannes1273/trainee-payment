import mongoose, { Schema } from './db.js';
import softDeletePlugin from './softDeletePlugin.js';

const OccupationSchema = new Schema({
  name: { type: String, required: true },
  departmentId: { type: String, required: true }, // FK to Department
});

OccupationSchema.plugin(softDeletePlugin);

const Occupation = mongoose.model('Occupation', OccupationSchema);
export default Occupation;
