import mongoose from 'mongoose';

const VoteSchema = new mongoose.Schema({
  shirtNumber: { type: Number, required: true },  //The voter
  mentalSupport: { type: String, required: true }, // Mental Support Vote
  bonusTarget: { type: String, required: true }, // Bonus Point Target
  bonusReason: { type: String, required: true }, // Mandatory Message
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Vote || mongoose.model('Vote', VoteSchema);