'use client';

import { useState } from 'react';

const PLAYER_ROLES: Record<string, string> = {
  "Jeanne": "Pass", "Laura": "Pass",
  "Yarina": "Libera", "Elonie": "Libera",
  "Ainoa": "Neben", "Maria": "Neben", "Eda": "Neben", "Sofia": "Neben",
  "Vera": "Dia", "Seraina": "Dia",
  "Anaïs": "Mitte", "Tina": "Mitte", "Eli": "Mitte"
};

const ROLE_ORDER = ["Pass", "Neben", "Mitte", "Dia", "Libera", "Unassigned"];

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'Pass': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    case 'Libera': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
    case 'Dia': return 'bg-violet-500/20 text-violet-300 border-violet-500/40';
    case 'Neben': return 'bg-red-500/20 text-red-300 border-red-500/40';
    case 'Mitte': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    default: return 'bg-slate-700 text-slate-300 border-slate-600';
  }
};

// Helper to compute balls played by each player in a single set
function computeSetStats(set: any) {
  const scoreMatch = (set.finalScore || '').trim().replace(/[\s\-]+/g, ':').match(/^(\d+):(\d+)$/);
  const totalBalls = scoreMatch ? parseInt(scoreMatch[1], 10) + parseInt(scoreMatch[2], 10) : 0;
  const d5Points = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
  const oppPoints = scoreMatch ? parseInt(scoreMatch[2], 10) : 0;

  const playerBalls: Record<string, number> = {};
  const activeCourt = new Set<string>((set.startingLineup || []).filter(Boolean));
  const entryBall: Record<string, number> = {};

  activeCourt.forEach(p => { entryBall[p] = 0; });

  (set.substitutions || []).forEach((sub: any) => {
    const subMatch = (sub.score || '').trim().replace(/[\s\-]+/g, ':').match(/^(\d+):(\d+)$/);
    const subBallPoint = subMatch ? parseInt(subMatch[1], 10) + parseInt(subMatch[2], 10) : 0;

    if (activeCourt.has(sub.playerOut)) {
      const stint = subBallPoint - (entryBall[sub.playerOut] || 0);
      playerBalls[sub.playerOut] = (playerBalls[sub.playerOut] || 0) + Math.max(0, stint);
      activeCourt.delete(sub.playerOut);
    }
    activeCourt.add(sub.playerIn);
    entryBall[sub.playerIn] = subBallPoint;
  });

  activeCourt.forEach(p => {
    const stint = totalBalls - (entryBall[p] || 0);
    playerBalls[p] = (playerBalls[p] || 0) + Math.max(0, stint);
  });

  // Libera shares
  if (set.liberoShares && Object.keys(set.liberoShares).length > 0) {
    Object.entries(set.liberoShares).forEach(([name, pct]) => {
      playerBalls[name] = Math.round(totalBalls * ((pct as number) / 100));
    });
  } else if (set.libero) {
    playerBalls[set.libero] = totalBalls;
  }

  return { totalBalls, d5Points, oppPoints, playerBalls };
}

export default function MatchesClient({ matches, allPlayers }: { matches: any[]; allPlayers: any[] }) {
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  if (matches.length === 0) {
    return (
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-12 text-center text-slate-400">
        Noch keine abgeschlossenen Matches in der Datenbank gespeichert.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map(match => {
        const isExpanded = expandedMatchId === match._id;
        const matchDate = new Date(match.createdAt).toLocaleDateString('de-CH', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

        let d5SetsWon = 0;
        let oppSetsWon = 0;
        let totalMatchBalls = 0;
        const totalBallsByPlayer: Record<string, number> = {};
        const attendedPlayers = new Set<string>();

        (match.sets || []).forEach((set: any) => {
          const stats = computeSetStats(set);
          totalMatchBalls += stats.totalBalls;
          if (stats.d5Points > stats.oppPoints) d5SetsWon++;
          else if (stats.oppPoints > stats.d5Points) oppSetsWon++;

          Object.entries(stats.playerBalls).forEach(([name, balls]) => {
            totalBallsByPlayer[name] = (totalBallsByPlayer[name] || 0) + balls;
            attendedPlayers.add(name);
          });
          if (set.libero) attendedPlayers.add(set.libero);
        });

        const absentPlayers = allPlayers.filter(p => !attendedPlayers.has(p.name));
        const wonMatch = d5SetsWon > oppSetsWon;

        return (
          <div 
            key={match._id} 
            className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow-lg transition-all"
          >
            {/* Card Summary Header */}
            <div 
              onClick={() => setExpandedMatchId(isExpanded ? null : match._id)}
              className="p-6 cursor-pointer hover:bg-slate-750 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none"
            >
              <div className="flex items-center gap-4">
                <div className={`w-3 h-12 rounded-full ${wonMatch ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">
                      vs {match.opponentName || 'Unbekanntes Team'}
                    </h2>
                    <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${wonMatch ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {wonMatch ? 'Sieg' : 'Niederlage'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{matchDate} • {match.sets?.length || 0} Sätze gespielt</p>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6">
                <div className="text-right">
                  <span className="text-2xl font-black text-white tracking-wider">{d5SetsWon} : {oppSetsWon}</span>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Endstand</p>
                </div>
                <span className="text-slate-400 text-lg transition-transform duration-200">
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {/* Expanded Detailed Breakdown */}
            {isExpanded && (
              <div className="border-t border-slate-700/80 p-6 bg-slate-900/50 space-y-6">
                
                {/* 1. Sets Details */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Sätze & Spielstände</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {(match.sets || []).map((set: any, idx: number) => (
                      <div key={idx} className="bg-slate-800 p-4 rounded-xl border border-slate-700/60">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-400">Satz {set.setNumber || idx + 1}</span>
                          <span className="text-sm font-black text-indigo-400">{set.finalScore || '—'}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2">
                          Wechsel: {set.substitutions?.length || 0}
                        </p>
                        {set.substitutions && set.substitutions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {set.substitutions.map((sub: any, sIdx: number) => (
                              <p key={sIdx} className="text-[10px] text-slate-400">
                                • {sub.playerIn} für {sub.playerOut} ({sub.score})
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Player Playtime Grouped by Role */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                    Spielzeit pro Spielerin (Total Bälle: {totalMatchBalls})
                  </h3>
                  
                  <div className="space-y-4">
                    {ROLE_ORDER.map(role => {
                      const attendingInRole = Array.from(attendedPlayers)
                        .filter(name => (PLAYER_ROLES[name] || 'Unassigned') === role)
                        .sort();

                      if (attendingInRole.length === 0) return null;

                      return (
                        <div key={role} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getRoleBadge(role)}`}>
                              {role === 'Mitte' ? 'Mitte (Haupt)' : role}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {attendingInRole.map(playerName => {
                              const balls = totalBallsByPlayer[playerName] || 0;
                              const pct = totalMatchBalls === 0 ? 0 : Math.round((balls / totalMatchBalls) * 100);
                              const playerObj = allPlayers.find(p => p.name === playerName);

                              return (
                                <div key={playerName} className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                                  <span className="text-sm font-bold text-slate-200">
                                    #{playerObj?.shirtNumber ?? '?'} {playerName}
                                  </span>
                                  <div className="text-right">
                                    <span className="text-sm font-black text-indigo-400">{pct}%</span>
                                    <span className="text-[10px] text-slate-500 ml-1.5">({balls} Bälle)</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Absent Players */}
                {absentPlayers.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Abwesend</h3>
                    <div className="flex flex-wrap gap-2">
                      {absentPlayers.map(p => (
                        <span key={p.name} className="px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-xs font-medium border border-slate-700/60">
                          #{p.shirtNumber} {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}