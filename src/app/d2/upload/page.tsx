import dbConnect from '@/lib/db';
import D2Match from '@/models/D2Match';
import D2UploadClient from './D2UploadClient';

export const dynamic = 'force-dynamic';

export default async function D2UploadPage() {
  await dbConnect();
  const rawMatches = await D2Match.find({})
    .select('date opponent isHome setsWon setsLost setScores')
    .sort({ date: -1, createdAt: -1 })
    .lean();

  const matches = rawMatches.map((m: any) => ({
    _id: m._id.toString(),
    date: m.date || '',
    opponent: m.opponent || 'Unbekannt',
    isHome: Boolean(m.isHome),
    setsWon: m.setsWon ?? 0,
    setsLost: m.setsLost ?? 0,
    setScores: Array.isArray(m.setScores) ? m.setScores : [],
  }));

  return <D2UploadClient initialMatches={matches} />;
}