import mongoose from 'mongoose';

const VoteSchema = new mongoose.Schema({
  shirtNumber: { type: Number, required: true }, 
  shield: String,
  spark: String,
  catalyst: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Vote || mongoose.model('Vote', VoteSchema);