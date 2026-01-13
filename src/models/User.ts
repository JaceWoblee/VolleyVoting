import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  shirtNumber: { type: Number, required: true, unique: true },
  pin: { type: String, required: true },
  name: { type: String, required: true },
  hasVoted: { type: Boolean, default: false },
  needsPasswordChange: { type: Boolean, default: true }
});

export default mongoose.models.User || mongoose.model('User', UserSchema);