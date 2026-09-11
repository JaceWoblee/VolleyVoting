import mongoose from 'mongoose';

const pollVoteSchema = new mongoose.Schema({
  pollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
  shirtNumber: { type: Number, required: true },
  playerName: { type: String, required: true },
  answer: { type: String, required: true },
  reason: { type: String, default: "" }, // NEW: Save their explanation
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.PollVote || mongoose.model('PollVote', pollVoteSchema);