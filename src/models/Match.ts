import mongoose, { Schema, models } from 'mongoose';

const matchSchema = new Schema({
  status: { type: String, enum: ['live', 'finished'], default: 'live' },
  currentSetNumber: { type: Number, default: 1 },
  court: [{ type: String }],
  libero: { type: String },
  opponentName: { type: String, default: 'Unbekannt' },
  sets: { type: Schema.Types.Mixed, default: [] } 
}, { timestamps: true });

const Match = models.Match || mongoose.model('Match', matchSchema);
export default Match;