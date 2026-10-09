import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import CheckIn from '@/models/CheckIn';
import { 
  LEGACY_ATTENDANCE, 
  LEGACY_TOTAL_SESSIONS,
  PLAYER_ROLES
} from '@/lib/attendanceConfig';

export const dynamic = 'force-dynamic';

export default async function AttendanceDashboard() {
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

  const users = await User.find({ shirtNumber: { $nin: [0, 1] } }).sort({ name: 1 });
  const allTrainingCheckIns = await CheckIn.find({ type: { $ne: 'match' } });

  // 1. Calculate Timelines for Training
  const uniqueDatesArray = Array.from(
    new Set<string>(
      allTrainingCheckIns.map(record => new Date(record.createdAt).toDateString())
    )
  ).sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());

  const dbTotalSessions = uniqueDatesArray.length;
  const totalPossible = LEGACY_TOTAL_SESSIONS + dbTotalSessions;
  
  // Extract the last 10 unique training sessions for the recent streak display
  const recentTrainingDates = uniqueDatesArray.slice(-10);

  // 2. Global Match Denominator
  const maxDbBalls = Math.max(...users.map(u => u.teamMatchBalls || 0), 0);
  const dbTotalMatchBalls = maxDbBalls;

  // 3. Track Team Totals for the Averages
  let totalTeamTrainingAttended = 0;
  let totalTeamTrainingPossible = 0;
  let totalTeamMatchPlayed = 0;
  let totalTeamMatchPossible = 0;

  // 4. Process data for all players and attach their recent training streak
  const rosterStats = users.map(user => {
    const legacyAttended = LEGACY_ATTENDANCE[user.name] || 0;
    const dbAttended = allTrainingCheckIns.filter(r => r.playerName === user.name).length;
    const totalAttended = legacyAttended + dbAttended;
    const trainingPct = totalPossible === 0 ? 0 : Math.round((totalAttended / totalPossible) * 100);
    
    const dbBallsPlayed = user.matchBallsPlayed || 0;
    const matchPct = dbTotalMatchBalls === 0 ? 0 : Math.round((dbBallsPlayed / dbTotalMatchBalls) * 100);

    // Build recent training history squares
    const recentHistory = recentTrainingDates.map(dateStr => {
      const attended = allTrainingCheckIns.some(
        r => r.playerName === user.name && new Date(r.createdAt).toDateString() === dateStr
      );
      const d = new Date(dateStr);
      const label = `${d.getDate()}. ${d.toLocaleString('de-CH', { month: 'short' })}`;
      return { label, attended };
    });

    totalTeamTrainingAttended += totalAttended;
    totalTeamTrainingPossible += totalPossible;
    totalTeamMatchPlayed += dbBallsPlayed;
    totalTeamMatchPossible += dbTotalMatchBalls;

    return {
      name: user.name,
      shirtNumber: user.shirtNumber,
      role: PLAYER_ROLES[user.name] || "Unassigned",
      totalAttended,
      trainingPct,
      matchPct,
      recentHistory
    };
  });

  const teamAvgTrainingPct = totalTeamTrainingPossible === 0 ? 0 : Math.round((totalTeamTrainingAttended / totalTeamTrainingPossible) * 100);
  const teamAvgMatchPct = totalTeamMatchPossible === 0 ? 0 : Math.round((totalTeamMatchPlayed / totalTeamMatchPossible) * 100);

  const roleOrder = ["Pass", "Neben", "Mitte", "Dia", "Libera", "Unassigned"];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-600">Depth Chart & Court Time</h1>
            <p className="text-slate-500 text-sm mt-1">
              Trainings: {totalPossible} gesamt • Match-Bälle: {dbTotalMatchBalls}
            </p>
          </div>
          <div className="flex gap-3">
            <a 
              href="/admin/attendance/playercount" 
              className="bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-slate-50 text-sm flex items-center gap-1.5 transition-all"
            >
              <span>👥</span> Teilnehmer
            </a>
            <a 
              href="/admin/attendance/matches" 
              className="bg-indigo-600 border border-indigo-700 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold shadow-sm transition-all text-sm flex items-center gap-1.5"
            >
              <span>🏐</span> Matches
            </a>
            <a 
              href="/admin" 
              className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-slate-50 text-sm"
            >
              ← Back to Admin
            </a>
          </div>
        </div>

        {/* Team Averages Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col items-center justify-center">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Team Training Average</span>
            <span className="text-5xl font-black text-indigo-600">{teamAvgTrainingPct}%</span>
          </div>
        </div>

        {/* Role-Grouped Stacked Lists */}
        {roleOrder.map(role => {
          const playersInRole = rosterStats.filter(p => p.role === role);
          if (playersInRole.length === 0) return null;

          return (
            <div key={role} className="space-y-3">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest border-b-2 border-indigo-100 pb-2">
                {role === 'Mitte' ? 'Mitte' : role}
              </h2>
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
                {playersInRole.map(stat => (
                  <div 
                    key={stat.shirtNumber} 
                    className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-slate-50/70 transition-colors"
                  >
                    
                    {/* Player Info */}
                    <div className="w-48 shrink-0 flex items-center gap-3">
                      <span className="text-xl font-black text-slate-300 w-8">#{stat.shirtNumber}</span>
                      <h3 className="text-lg font-bold text-slate-800 truncate">{stat.name}</h3>
                    </div>
                    
                    {/* Progress Bars */}
                    <div className="flex-1 max-w-md space-y-3">
                      {/* Training Bar */}
                      <div className="flex items-center gap-3">
                        <span className="w-20 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right shrink-0">Training</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div 
                            className={`h-3 rounded-full transition-all ${stat.trainingPct >= 80 ? 'bg-emerald-500' : stat.trainingPct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${stat.trainingPct}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs font-black text-slate-700">{stat.trainingPct}%</span>
                      </div>

                      {/* Match Bar */}
                      <div className="flex items-center gap-3">
                        <span className="w-20 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right shrink-0">Match</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-blue-500 h-3 rounded-full transition-all" 
                            style={{ width: `${stat.matchPct}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs font-black text-slate-700">{stat.matchPct}%</span>
                      </div>
                    </div>

                    {/* Recent Training Check-in Squares */}
                    <div className="shrink-0 flex flex-col items-start lg:items-end">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Letzte Trainings
                      </span>
                      <div className="flex gap-1.5 flex-wrap">
                        {stat.recentHistory.length > 0 ? (
                          stat.recentHistory.map((session, i) => (
                            <div 
                              key={i} 
                              title={`${session.label}: ${session.attended ? 'Anwesend' : 'Abwesend'}`}
                              className={`w-6 h-6 rounded flex items-center justify-center shadow-sm text-white ${
                                session.attended ? 'bg-emerald-500' : 'bg-red-400'
                              }`}
                            >
                              <span className="text-[10px] font-black leading-none">
                                {session.attended ? '✓' : '✕'}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">Keine Einträge</span>
                        )}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}