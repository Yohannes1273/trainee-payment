import mongoose, { Schema } from './db.js';
import softDeletePlugin from './softDeletePlugin.js';

const ProgramSchema = new Schema({
  name: { 
    type: String, 
    enum: ['Regular', 'Extension', 'Weekend', 'Short Term'], 
    required: true 
  },
  occupationId: { type: String, required: true }, // FK to Occupation
});

ProgramSchema.plugin(softDeletePlugin);

const Program = mongoose.model('Program', ProgramSchema);
export default Program;
