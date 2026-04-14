import mongoose from 'mongoose';

const TrainingFocusSchema = new mongoose.Schema({
  shirtNumber: { type: Number, required: true },
  playerName: { type: String, required: true },
  focusPoint: { type: String, required: true },
  isActive: { type: Boolean, default: true }, // The magic switch!
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.TrainingFocus || mongoose.model('TrainingFocus', TrainingFocusSchema);