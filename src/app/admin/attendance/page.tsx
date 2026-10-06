import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import CheckIn from '@/models/CheckIn';
import { 
  LEGACY_ATTENDANCE, 
  LEGACY_TOTAL_SESSIONS,
  LEGACY_MATCH_BALLS,         
  LEGACY_TOTAL_MATCH_BALLS,    
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
  const allCheckIns = await CheckIn.find({ type: 'training' });

  // 1. Calculate Timelines for Training
  const uniqueDates = new Set(
    allCheckIns.map(record => new Date(record.createdAt).toDateString())
  );
  const dbTotalSessions = uniqueDates.size;
  const totalPossible = LEGACY_TOTAL_SESSIONS + dbTotalSessions;
  
  // NEW: Calculate Total Match Balls dynamically. 
  const maxDbBalls = Math.max(...users.map(u => u.teamMatchBalls || 0), 0);
  const dbTotalMatchBalls = maxDbBalls;

  // 2. Track Team Totals for the Averages
  let totalTeamTrainingAttended = 0;
  let totalTeamTrainingPossible = 0;
  let totalTeamMatchPlayed = 0;
  let totalTeamMatchPossible = 0;

  // 3. Process data for all players and attach their role
  const rosterStats = users.map(user => {
    // Training Math
    const legacyAttended = LEGACY_ATTENDANCE[user.name] || 0;
    const dbAttended = allCheckIns.filter(r => r.playerName === user.name).length;
    const totalAttended = legacyAttended + dbAttended;
    const trainingPct = totalPossible === 0 ? 0 : Math.round((totalAttended / totalPossible) * 100);
    
    // NEW: Match Math (Using Exact Balls Played)
    const dbBallsPlayed = user.matchBallsPlayed || 0;
    const dbTeamBalls = user.teamMatchBalls || 0;

    const legacyBallsPlayed = LEGACY_MATCH_BALLS[user.name] || 0;
    const legacyTeamBalls = LEGACY_TOTAL_MATCH_BALLS;
    
    // Combine the hardcoded first match with all future database matches
    const totalBallsPlayed = legacyBallsPlayed + dbBallsPlayed;
    const totalTeamBalls = legacyTeamBalls + dbTeamBalls;
    
    const matchPct = totalTeamBalls === 0 ? 0 : Math.round((totalBallsPlayed / totalTeamBalls) * 100);

    // Add to team totals
    totalTeamTrainingAttended += totalAttended;
    totalTeamTrainingPossible += totalPossible;
    totalTeamMatchPlayed += totalBallsPlayed;
    totalTeamMatchPossible += totalTeamBalls;

    return {
      name: user.name,
      shirtNumber: user.shirtNumber,
      role: PLAYER_ROLES[user.name] || "Unassigned",
      totalAttended,
      trainingPct,
      matchPct // Only passing the final percentage to the UI now
    };
  });

  // Calculate Team Averages
  const teamAvgTrainingPct = totalTeamTrainingPossible === 0 ? 0 : Math.round((totalTeamTrainingAttended / totalTeamTrainingPossible) * 100);
  const teamAvgMatchPct = totalTeamMatchPossible === 0 ? 0 : Math.round((totalTeamMatchPlayed / totalTeamMatchPossible) * 100);

  const roleOrder = ["Pass", "Neben", "Mitte", "Dia", "Libera", "Unassigned"];

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-black">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-indigo-600">Depth Chart & Court Time</h1>
            <p className="text-slate-500 mt-1">Total Training Sessions: {totalPossible} | Total Match Balls: {dbTotalMatchBalls}</p>
          </div>
          <a href="/admin" className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-slate-50">
            ← Back to Admin
          </a>
        </div>

        {/* Team Averages Dashboard */}
        <div className="grid grid-cols-2 gap-6 mb-10">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col items-center justify-center">
            <span className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Team Training Average</span>
            <span className="text-5xl font-black text-indigo-600">{teamAvgTrainingPct}%</span>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col items-center justify-center">
            <span className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Team Match Average</span>
            <span className="text-5xl font-black text-blue-600">{teamAvgMatchPct}%</span>
          </div>
        </div>

        {/* Grouped Player Stacked Lists */}
        {roleOrder.map(role => {
          const playersInRole = rosterStats.filter(p => p.role === role);
          
          if (playersInRole.length === 0) return null;

          return (
            <div key={role} className="mb-12">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest border-b-2 border-indigo-100 pb-2 mb-4">
                {role}
              </h2>
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {playersInRole.map((stat, index) => (
                  <div 
                    key={stat.shirtNumber} 
                    className={`p-5 flex items-center gap-8 hover:bg-slate-50 transition-colors ${index !== playersInRole.length - 1 ? 'border-b border-slate-100' : ''}`}
                  >
                    
                    {/* Player Name */}
                    <div className="w-[180px] flex items-center gap-3 shrink-0">
                      <span className="text-xl font-black text-slate-300 w-8">#{stat.shirtNumber}</span>
                      <h3 className="text-lg font-bold text-slate-800">{stat.name}</h3>
                    </div>
                    
                    {/* Stats Container */}
                    <div className="flex-1 space-y-4">
                      
                      {/* Training Bar Row */}
                      <div className="flex items-center gap-4">
                        <span className="w-[100px] text-xs font-bold text-slate-400 uppercase tracking-widest text-right shrink-0">Training</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                          <div 
                            className={`h-4 rounded-full transition-all ${stat.trainingPct >= 80 ? 'bg-emerald-500' : stat.trainingPct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${stat.trainingPct}%` }}
                          ></div>
                        </div>
                        <span className="w-[60px] text-right font-black text-slate-700">{stat.trainingPct}%</span>
                      </div>

                      {/* Match Bar Row */}
                      <div className="flex items-center gap-4">
                        <span className="w-[100px] text-xs font-bold text-slate-400 uppercase tracking-widest text-right shrink-0">Match Playtime</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                          <div 
                            className="bg-blue-500 h-4 rounded-full transition-all" 
                            style={{ width: `${stat.matchPct}%` }}
                          ></div>
                        </div>
                        <span className="w-[60px] text-right font-black text-slate-700">{stat.matchPct}%</span>
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