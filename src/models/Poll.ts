import mongoose from 'mongoose';

const pollSchema = new mongoose.Schema({
  question: { type: String, required: true },
  type: { type: String, enum: ['text', 'options'], required: true },
  options: { type: [String], default: [] },
  requireReason: { type: Boolean, default: false }, // NEW: Ask for a reason?
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Poll || mongoose.model('Poll', pollSchema);