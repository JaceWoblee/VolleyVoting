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
    
    // Calculate exactly 6 hours ago
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    
    // Fetch only check-ins created AFTER the 6-hour mark
    // Older check-ins remain safely stored in the database!
    const results = await CheckIn.find({ createdAt: { $gte: sixHoursAgo } });
    
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch results" }, { status: 500 });
  }
}