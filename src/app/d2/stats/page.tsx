import dbConnect from '@/lib/db';
import D2Match from '@/models/D2Match';
import D2StatsClient, { SerializedD2Match } from './D2StatsClient';

export const dynamic = 'force-dynamic';

export default async function D2StatsPage() {
  await dbConnect();
  const rawMatches = await D2Match.find({}).sort({ date: -1, createdAt: -1 }).lean();

  const matches: SerializedD2Match[] = rawMatches.map((m: any) => ({
    _id: m._id.toString(),
    date: m.date || '',
    opponent: m.opponent || 'Unbekannt',
    isHome: Boolean(m.isHome),
    setsWon: m.setsWon ?? 0,
    setsLost: m.setsLost ?? 0,
    setScores: Array.isArray(m.setScores) ? m.setScores : [],
    players: Array.isArray(m.players)
      ? m.players.map((p: any) => ({
          number: p.number ?? 0,
          name: p.name || '',
          isLibero: Boolean(p.isLibero),
          serve: {
            total: p.serve?.total ?? 0,
            aces: p.serve?.aces ?? 0,
            errors: p.serve?.errors ?? 0,
          },
          reception: {
            total: p.reception?.total ?? 0,
            perfect: p.reception?.perfect ?? 0,
            positive: p.reception?.positive ?? 0,
            errors: p.reception?.errors ?? 0,
          },
          attack: {
            total: p.attack?.total ?? 0,
            kills: p.attack?.kills ?? 0,
            errors: p.attack?.errors ?? 0,
            blocked: p.attack?.blocked ?? 0,
          },
          block: {
            total: p.block?.total ?? 0,
            kills: p.block?.kills ?? 0,
            positive: p.block?.positive ?? 0,
            errors: p.block?.errors ?? 0,
          },
          dig: {
            total: p.dig?.total ?? 0,
            positive: p.dig?.positive ?? 0,
            errors: p.dig?.errors ?? 0,
          },
        }))
      : [],
    rotations: Array.isArray(m.rotations)
      ? m.rotations.map((r: any) => ({
          zone: r.zone ?? 1,
          soTotal: r.soTotal ?? 0,
          soWon: r.soWon ?? 0,
          bpTotal: r.bpTotal ?? 0,
          bpWon: r.bpWon ?? 0,
        }))
      : [],
  }));

  return <D2StatsClient initialMatches={matches} />;
}