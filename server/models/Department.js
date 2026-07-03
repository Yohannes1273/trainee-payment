import mongoose, { Schema } from './db.js';
import softDeletePlugin from './softDeletePlugin.js';

const DepartmentSchema = new Schema({
  name: { type: String, required: true },
  headId: { type: String, default: null }, // User ID of Department Head
  trainerIds: { type: Array, default: [] }, // Array of User IDs of Trainers
});

DepartmentSchema.plugin(softDeletePlugin);

const Department = mongoose.model('Department', DepartmentSchema);
export default Department;
