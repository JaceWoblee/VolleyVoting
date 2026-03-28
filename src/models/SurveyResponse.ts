import mongoose from 'mongoose';

const SurveyResponseSchema = new mongoose.Schema({
  questionNumber: { type: Number, required: true }, // 1, 2, 3, 4, 5, or 6
  answer: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.SurveyResponse || mongoose.model('SurveyResponse', SurveyResponseSchema);