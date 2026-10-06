import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Match from '@/models/Match';

// Helper to calculate total balls from a score (e.g., "25:21" -> 46 balls)
const parseBalls = (scoreStr: string) => {
  if (!scoreStr) return 0;
  const match = scoreStr.trim().replace(/[\s\-]+/g, ':').match(/^(\d+):(\d+)$/);
  if (!match) return 0;
  return parseInt(match[1], 10) + parseInt(match[2], 10);
};

// 1. GET: Fetch the live match if the iPad restarts
export async function GET() {
  await dbConnect();
  const liveMatch = await Match.findOne({ status: 'live' });
  return NextResponse.json({ success: true, liveMatch }, { status: 200 });
}

// 2. PUT: Auto-save the draft during the game
export async function PUT(req: Request) {
  await dbConnect();
  const body = await req.json();
  
  // Find existing live match or create one
  const liveMatch = await Match.findOneAndUpdate(
    { status: 'live' },
    { ...body, status: 'live' },
    { new: true, upsert: true }
  );
  return NextResponse.json({ success: true, liveMatch }, { status: 200 });
}

// 3. POST: Match Abschließen - Calculate Balls & Update Users
export async function POST(req: Request) {
  try {
    await dbConnect();
    const liveMatch = await Match.findOne({ status: 'live' });
    if (!liveMatch) return NextResponse.json({ error: "No live match found" }, { status: 400 });

    const playerBallsEarned: Record<string, number> = {};
    let totalTeamBallsAcrossMatch = 0;

    liveMatch.sets.forEach((set: any) => {
      const setTotalBalls = parseBalls(set.finalScore);
      totalTeamBallsAcrossMatch += setTotalBalls;

      const activeCourt = new Set(set.startingLineup.filter(Boolean));
      const entryBall: Record<string, number> = {};
      
      activeCourt.forEach(player => { entryBall[player as string] = 0; });

      set.substitutions.forEach((sub: any) => {
        const subBallPoint = parseBalls(sub.score);
        if (activeCourt.has(sub.playerOut)) {
          const ballsPlayedInStint = subBallPoint - (entryBall[sub.playerOut] || 0);
          playerBallsEarned[sub.playerOut] = (playerBallsEarned[sub.playerOut] || 0) + ballsPlayedInStint;
          activeCourt.delete(sub.playerOut);
        }
        activeCourt.add(sub.playerIn);
        entryBall[sub.playerIn] = subBallPoint;
      });

      activeCourt.forEach(player => {
        const ballsPlayedInStint = setTotalBalls - (entryBall[player as string] || 0);
        playerBallsEarned[player as string] = (playerBallsEarned[player as string] || 0) + ballsPlayedInStint;
      });

      if (set.liberoShares && Object.keys(set.liberoShares).length > 0) {
        Object.entries(set.liberoShares).forEach(([libName, percent]) => {
          const libBalls = Math.round(setTotalBalls * ((percent as number) / 100));
          playerBallsEarned[libName] = (playerBallsEarned[libName] || 0) + libBalls;
        });
      } else if (set.libero) {
        playerBallsEarned[set.libero] = (playerBallsEarned[set.libero] || 0) + setTotalBalls;
      }
    });

    // Update the User Container
    const updatePromises = Object.entries(playerBallsEarned).map(([name, balls]) => {
      return User.updateOne(
        { name },
        { $inc: { matchBallsPlayed: balls, teamMatchBalls: totalTeamBallsAcrossMatch } }
      );
    });
    await Promise.all(updatePromises);

    // Close the draft container
    liveMatch.status = 'finished';
    await liveMatch.save();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}