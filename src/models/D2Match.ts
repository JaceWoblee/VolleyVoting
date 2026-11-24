import mongoose, { Schema, models } from 'mongoose';

const D2MatchSchema = new Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    opponent: { type: String, required: true },
    isHome: { type: Boolean, default: true },
    setsWon: { type: Number, required: true },
    setsLost: { type: Number, required: true },
    setScores: [{ type: String }],
    players: [
      {
        number: Number,
        name: String,
        isLibero: Boolean,
        serve: { total: Number, aces: Number, errors: Number },
        reception: { total: Number, perfect: Number, positive: Number, errors: Number },
        attack: { total: Number, kills: Number, errors: Number, blocked: Number },
        block: { total: Number, kills: Number, positive: Number, errors: Number },
        dig: { total: Number, positive: Number, errors: Number },
      },
    ],
    rotations: [
      {
        zone: Number,
        soTotal: Number,
        soWon: Number,
        bpTotal: Number,
        bpWon: Number,
      },
    ],
  },
  { timestamps: true }
);

const D2Match = models.D2Match || mongoose.model('D2Match', D2MatchSchema);
export default D2Match;