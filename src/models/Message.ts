import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  shirtNumber: { type: Number, required: true },
  playerName: { type: String, required: true },
  text: { type: String, required: true },
  isAnonymous: { type: Boolean, default: false }, // Add this field
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);