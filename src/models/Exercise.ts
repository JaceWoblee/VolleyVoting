import mongoose from 'mongoose';

const ExerciseSchema = new mongoose.Schema({
  title: { type: String, required: true }, // I suggest keeping this required so the card has a header
  description: { type: String, required: false, default: "" }, 
  videoLink: { type: String, required: false, default: "" },
  createdBy: { type: Number, required: true },
  playerName: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Exercise || mongoose.model('Exercise', ExerciseSchema);