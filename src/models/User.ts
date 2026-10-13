import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  shirtNumber: { type: Number, required: true, unique: true },
  pin: { type: String, required: true },
  name: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Pass', 'Neben', 'Mitte', 'Dia', 'Libera', 'Unassigned'], 
    default: 'Unassigned' 
  },
  hasVoted: { type: Boolean, default: false },
  needsPasswordChange: { type: Boolean, default: true },

  matchBallsPlayed: { type: Number, default: 0 },
  teamMatchBalls: { type: Number, default: 0 }
});

export default mongoose.models.User || mongoose.model('User', UserSchema);