import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { sets } = await req.json();

    // Map each player's earned sets across the match
    const playerSetCredits: Record<string, number> = {};

    sets.forEach((set: any) => {
      // Every player starting the set gets an initial credit of 1.0 set
      const currentSetPlayers = new Set([...set.startingLineup, set.libero].filter(Boolean));

      // Adjust for substitutions
      set.substitutions.forEach((sub: any) => {
        // Simple heuristic: subbing out reduces credit, subbing in adds credit
        // You can refine this standard fractional volleyball math later if needed!
        currentSetPlayers.delete(sub.playerOut);
        currentSetPlayers.add(sub.playerIn);
      });

      // Add to global tally
      currentSetPlayers.forEach((playerName: any) => {
        playerSetCredits[playerName] = (playerSetCredits[playerName] || 0) + 1;
      });
    });

    // Update users in database (or save to a Match history collection)
    // For now, we increment their match sets played
    for (const [name, setsPlayed] of Object.entries(playerSetCredits)) {
      await User.updateOne(
        { name },
        { $inc: { matchSetsPlayed: setsPlayed } }
      );
    }

    return NextResponse.json({ success: true, credits: playerSetCredits }, { status: 200 });
  } catch (error) {
    console.error("Match saving error:", error);
    return NextResponse.json({ success: false, error: "Failed to save match" }, { status: 500 });
  }
}