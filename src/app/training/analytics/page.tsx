import dbConnect from '@/lib/db';
import TrainingGame from '@/models/TrainingGame';
import Match from '@/models/Match';
import AnalyticsClient, { SerializedGame, SerializedMatch } from './AnalyticsClient';

export const dynamic = 'force-dynamic';

export default async function TrainingAnalyticsPage() {
  await dbConnect();
  const [rawGames, rawMatches] = await Promise.all([
    TrainingGame.find({}).sort({ date: -1 }).lean(),
    Match.find({}).sort({ createdAt: -1 }).lean(),
  ]);

  const games: SerializedGame[] = rawGames.map((g: any) => ({
    _id: g._id.toString(),
    date: g.date ? new Date(g.date).toISOString() : new Date(g.createdAt).toISOString(),
    mode: g.mode || '6v6',
    finalScoreA: g.finalScoreA ?? 0,
    finalScoreB: g.finalScoreB ?? 0,
    checkInSnapshot: (g.checkInSnapshot || []).map((c: any) => ({
      shirtNumber: c.shirtNumber,
      name: c.name,
      role: c.role,
      mental: c.mental ?? 5,
      physical: c.physical ?? 5,
    })),
    points: (g.points || []).map((p: any) => ({
      winner: p.winner,
      scoreA: p.scoreA,
      scoreB: p.scoreB,
      teamA: p.teamA || [],
      teamB: p.teamB || [],
      servingTeam: p.servingTeam ?? null,
      server: p.server ?? null,
      isEighthBall: Boolean(p.isEighthBall),
      clutchScorer: p.clutchScorer ?? null,
      clutchIsError: Boolean(p.clutchIsError),
      timestamp: p.timestamp ? new Date(p.timestamp).toISOString() : '',
      pointType: p.pointType || 'normal',
    })),
    queensLeaderboard: (g.queensLeaderboard || []).map((q: any) => ({
      teamName: q.teamName,
      players: q.players || [],
      points: q.points ?? 0,
    })),
  }));

  const matches: SerializedMatch[] = rawMatches.map((m: any) => ({
    _id: m._id.toString(),
    date: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
    status: m.status || 'finished',
    opponentName: m.opponentName || 'Unbekannt',
    opponentTier: m.opponentTier || 'mid', // <-- check this line
    sets: Array.isArray(m.sets)
      ? m.sets.map((s: any) => ({
          setNumber: s.setNumber ?? 0,
          startingLineup: Array.isArray(s.startingLineup) ? s.startingLineup : [],
          libero: s.libero || '',
          finalScore: s.finalScore || '',
          liberoShares: s.liberoShares || {},
          substitutions: Array.isArray(s.substitutions)
            ? s.substitutions.map((sub: any) => ({
                playerOut: sub.playerOut || '',
                playerIn: sub.playerIn || '',
                score: sub.score || '',
              }))
            : [],
        }))
      : [],
  }));

  return <AnalyticsClient games={games} matches={matches} />;
}