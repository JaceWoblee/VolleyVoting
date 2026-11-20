import mongoose, { Schema, Document } from 'mongoose';

export interface ITrainingPoint {
  winner: 'A' | 'B';
  scoreA: number;
  scoreB: number;
  teamA: number[];
  teamB: number[];
  servingTeam?: 'A' | 'B' | null; // null = coach free ball (Balls 2–7 in 8-Ball)
  server?: number | null;         // shirtNumber of server
  isEighthBall?: boolean;
  clutchScorer?: number | null;
  clutchIsError?: boolean;
  timestamp: Date;
}

export interface ICheckInSnapshot {
  shirtNumber: number;
  name: string;
  role: string;
  mental: number;
  physical: number;
}

export interface IQueensTeamResult {
  teamName: string;
  players: number[];
  points: number;
}

export interface ITrainingGame extends Document {
  date: Date;
  mode: string;
  finalScoreA: number;
  finalScoreB: number;
  checkInSnapshot: ICheckInSnapshot[];
  points: ITrainingPoint[];
  queensLeaderboard?: IQueensTeamResult[];
}

const TrainingGameSchema = new Schema<ITrainingGame>(
  {
    date: { type: Date, default: Date.now },
    mode: { type: String, default: '6v6' },
    finalScoreA: { type: Number, required: true },
    finalScoreB: { type: Number, required: true },
    checkInSnapshot: [
      {
        shirtNumber: Number,
        name: String,
        role: String,
        mental: Number,
        physical: Number,
      },
    ],
    points: [
      {
        winner: { type: String, enum: ['A', 'B'], required: true },
        scoreA: { type: Number, required: true },
        scoreB: { type: Number, required: true },
        teamA: [Number],
        teamB: [Number],
        servingTeam: { type: String, enum: ['A', 'B', null], default: null },
        server: { type: Number, default: null },
        isEighthBall: { type: Boolean, default: false },
        clutchScorer: { type: Number, default: null },
        clutchIsError: { type: Boolean, default: false },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    queensLeaderboard: [
      {
        teamName: String,
        players: [Number],
        points: Number,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.TrainingGame ||
  mongoose.model<ITrainingGame>('TrainingGame', TrainingGameSchema);