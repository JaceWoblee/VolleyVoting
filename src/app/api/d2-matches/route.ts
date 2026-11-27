import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import D2Match from '@/models/D2Match';
import { parseDvwFile } from '@/lib/dvwParser';

export async function GET() {
  try {
    await dbConnect();
    const matches = await D2Match.find({}).sort({ date: -1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, matches });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Fehler beim Laden.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { rawText, teamKeyword = 'D2' } = body;

    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json({ error: 'Keine .dvw Daten erhalten.' }, { status: 400 });
    }

    const parsed = parseDvwFile(rawText, teamKeyword);
    if (parsed.players.length === 0) {
      return NextResponse.json(
        { error: 'Konnte keine Spielerinnen-Daten in der .dvw Datei finden.' },
        { status: 400 }
      );
    }

    const created = await D2Match.create(parsed);
    return NextResponse.json({
      success: true,
      match: {
        ...parsed,
        _id: created._id.toString(),
      },
    });
  } catch (e: any) {
    console.error('Error parsing/saving DVW:', e);
    return NextResponse.json({ error: e.message || 'Fehler beim Speichern.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Match-ID fehlt.' }, { status: 400 });
    }
    await D2Match.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Fehler beim Löschen.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const { id, opponent } = await req.json();
    if (!id || !opponent?.trim()) {
      return NextResponse.json({ error: 'ID oder Gegnername fehlt.' }, { status: 400 });
    }
    await D2Match.findByIdAndUpdate(id, { opponent: opponent.trim() });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Fehler beim Umbenennen.' }, { status: 500 });
  }
}