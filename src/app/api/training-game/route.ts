import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import TrainingGame from '@/models/TrainingGame';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { mode, finalScoreA, finalScoreB, checkInSnapshot, points, queensLeaderboard } = body;

    if (!points || points.length === 0) {
      return NextResponse.json(
        { error: 'Keine Punkte zum Speichern vorhanden.' },
        { status: 400 }
      );
    }

    const game = await TrainingGame.create({
      mode: mode || '6v6',
      finalScoreA,
      finalScoreB,
      checkInSnapshot,
      points,
      ...(queensLeaderboard ? { queensLeaderboard } : {}),
    });

    return NextResponse.json({ success: true, id: game._id });
  } catch (e: any) {
    console.error('Error saving training game:', e);
    return NextResponse.json(
      { error: e.message || 'Fehler beim Speichern.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await dbConnect();
    const games = await TrainingGame.find({}).sort({ createdAt: -1 }).limit(50);
    return NextResponse.json({ games });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}