import mongoose, { Schema, Document } from 'mongoose';

export interface ICheckIn extends Document {
  playerName: string;
  mentalHealth: number;
  physicalHealth: number;
  createdAt: Date;
}

const CheckInSchema: Schema = new Schema({
  playerName: { type: String, required: true },
  mentalHealth: { type: Number, required: true },
  physicalHealth: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// This prevents Next.js from crashing by trying to create the model twice
export default mongoose.models.CheckIn || mongoose.model<ICheckIn>('CheckIn', CheckInSchema);