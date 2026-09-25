import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import CheckIn from '../../../models/CheckIn';

// Helper to ensure MongoDB is connected
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  // Make sure you have MONGODB_URI in your .env.local file!
  await mongoose.connect(process.env.MONGODB_URI as string);
};

// Handles the POST request when a player clicks "Done"
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    
    // 1. Calculate a 4-hour cooldown period
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    
    // 2. Check if THIS player already submitted recently
    const recentCheckIn = await CheckIn.findOne({
      playerName: body.playerName,
      createdAt: { $gte: fourHoursAgo }
    });

    if (recentCheckIn) {
      return NextResponse.json({ 
        success: false, 
        error: "Player already checked in recently." 
      }, { status: 429 }); // 429 means "Too Many Requests"
    }

    // 3. If no recent check-in, proceed with saving
    const newCheckIn = await CheckIn.create(body);
    return NextResponse.json({ success: true, data: newCheckIn }, { status: 201 });
    
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to save check-in" }, { status: 500 });
  }
}

// Handles the GET request when you open the Results page
export async function GET() {
  try {
    await connectDB();
    
    // We now fetch ALL check-ins so the frontend can filter 
    // them by training, week, month, or season.
    const results = await CheckIn.find({});
    
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch results" }, { status: 500 });
  }
}