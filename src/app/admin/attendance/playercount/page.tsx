import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import CheckIn from '@/models/CheckIn';
import Match from '@/models/Match';

export const dynamic = 'force-dynamic';

interface SessionSummary {
  dateKey: string;
  dateObj: Date;
  weekdayStr: string;
  formattedDate: string;
  type: 'training' | 'match';
  playerCount: number;
  players: string[];
  opponentName?: string;
  matchScore?: string;
}

export default async function PlayerCountPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  if (!session || session.value !== 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <a href="/" className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg">← Login</a>
      </div>
    );
  }

  await dbConnect();

  // 1. Fetch all check-ins and finished matches
  const checkIns = await CheckIn.find({}).sort({ createdAt: -1 });
  const matches = await Match.find({ status: 'finished' }).sort({ createdAt: -1 });

  // 2. Group check-ins by date string and type
  const sessionsMap: Record<string, SessionSummary> = {};

  checkIns.forEach(record => {
    const d = new Date(record.createdAt);
    const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}_${record.type || 'training'}`;
    const sessionType: 'training' | 'match' = record.type === 'match' ? 'match' : 'training';

    if (!sessionsMap[dateKey]) {
      const weekdayStr = d.toLocaleDateString('de-CH', { weekday: 'long' });
      const formattedDate = d.toLocaleDateString('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // Find match metadata if it's a match session
      let opponentName: string | undefined;
      let matchScore: string | undefined;

      if (sessionType === 'match') {
        const matchingGame = matches.find(m => {
          const mDate = new Date(m.createdAt);
          return mDate.toDateString() === d.toDateString();
        });

        if (matchingGame) {
          opponentName = matchingGame.opponentName;
          const scores = (matchingGame.sets || []).map((s: any) => s.finalScore).filter(Boolean).join(', ');
          matchScore = scores || undefined;
        }
      }

      sessionsMap[dateKey] = {
        dateKey,
        dateObj: d,
        weekdayStr,
        formattedDate,
        type: sessionType,
        playerCount: 0,
        players: [],
        opponentName,
        matchScore
      };
    }

    if (!sessionsMap[dateKey].players.includes(record.playerName)) {
      sessionsMap[dateKey].players.push(record.playerName);
      sessionsMap[dateKey].playerCount += 1;
    }
  });

  // 3. Sort chronologically (most recent first)
  const sessionsList = Object.values(sessionsMap).sort(
    (a, b) => b.dateObj.getTime() - a.dateObj.getTime()
  );

  // Helper for card styling
  const getCardStyle = (session: SessionSummary) => {
    if (session.type === 'match') {
      return 'bg-white border-slate-200 text-slate-900 shadow-sm';
    }

    // Trainings
    if (session.playerCount >= 10) {
      return 'bg-emerald-50 border-emerald-200 text-emerald-950 shadow-sm';
    }
    if (session.playerCount >= 8) {
      return 'bg-amber-50 border-amber-200 text-amber-950 shadow-sm';
    }
    return 'bg-rose-50 border-rose-200 text-rose-950 shadow-sm';
  };

  const getBadgeStyle = (session: SessionSummary) => {
    if (session.type === 'match') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (session.playerCount >= 10) {
      return 'bg-emerald-200/70 text-emerald-900 border-emerald-300';
    }
    if (session.playerCount >= 8) {
      return 'bg-amber-200/70 text-amber-900 border-amber-300';
    }
    return 'bg-rose-200/70 text-rose-900 border-rose-300';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-600 flex items-center gap-3">
              <span>👥</span> Teilnehmerzahlen
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Übersicht über Spielerpräsenzen bei Trainings und Matches.
            </p>
          </div>
          <div className="flex gap-3">
            <a 
              href="/admin/attendance" 
              className="bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all"
            >
              ← Attendance
            </a>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 text-xs font-semibold">
          <span className="text-slate-400 uppercase tracking-wider text-[11px]">Legende:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300 inline-block" />
            <span>≥ 10 (Optimal)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300 inline-block" />
            <span>8 - 9 (Knapp)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-300 inline-block" />
            <span>≤ 7 (Kritisch)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-white border border-slate-300 inline-block" />
            <span>Match</span>
          </div>
        </div>

        {/* Sessions List */}
        {sessionsList.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
            Noch keine Check-ins vorhanden.
          </div>
        ) : (
          <div className="space-y-4">
            {sessionsList.map(session => (
              <div 
                key={session.dateKey} 
                className={`p-5 rounded-2xl border transition-all ${getCardStyle(session)}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left: Date & Type */}
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-black shrink-0">
                      {session.type === 'match' ? '🔥' : '🏐'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base sm:text-lg">
                          {session.weekdayStr}, {session.formattedDate}
                        </span>
                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded border ${getBadgeStyle(session)}`}>
                          {session.type === 'match' ? 'Match' : 'Training'}
                        </span>
                      </div>
                      
                      {session.type === 'match' && session.opponentName && (
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          Gegner: <span className="text-slate-800 font-bold">{session.opponentName}</span>
                          {session.matchScore && <span className="ml-2 font-normal">({session.matchScore})</span>}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Participant Count */}
                  <div className="flex items-center sm:justify-end gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-black">
                        {session.playerCount}
                      </span>
                      <span className="text-xs font-bold opacity-60 ml-1">Spielerinnen</span>
                    </div>
                  </div>

                </div>

                {/* Bottom: Player Name Tags */}
                <div className="mt-4 pt-3 border-t border-black/5 flex flex-wrap gap-1.5">
                  {session.players.sort().map(name => (
                    <span 
                      key={name}
                      className="text-xs px-2.5 py-1 rounded-md bg-white/60 font-medium shadow-xs"
                    >
                      {name}
                    </span>
                  ))}
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}