'use client';

import { useState, useMemo } from 'react';

export interface Player {
  name: string;
  number: number;
  role: string;
  mental: number;
  physical: number;
}

interface QueensTeam {
  id: string;
  name: string;
  players: number[];
  points: number;
}

interface PointLog {
  winner: 'A' | 'B';
  scoreA: number;
  scoreB: number;
  teamA: number[];
  teamB: number[];
  timestamp: string;
}

type SwapSelection =
  | { kind: 'team'; teamId: string; playerNumber: number }
  | { kind: 'bench'; playerNumber: number };

const getRoleColors = (role: string) => {
  switch (role) {
    case 'Pass': return 'bg-blue-500/15 border-blue-500/40 text-blue-200';
    case 'Libera': return 'bg-yellow-500/15 border-yellow-500/40 text-yellow-200';
    case 'Dia': return 'bg-violet-500/15 border-violet-500/40 text-violet-200';
    case 'Neben': return 'bg-red-500/15 border-red-500/40 text-red-200';
    case 'Mitte': return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200';
    case 'Gast (Stark)': return 'bg-fuchsia-500/15 border-fuchsia-400/50 text-fuchsia-200';
    case 'Gast (Mittel)': return 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200';
    case 'Gast (Schwach)': return 'bg-slate-600/30 border-slate-400/50 text-slate-200';
    default: return 'bg-slate-800 border-slate-700 text-slate-200';
  }
};

const shuffleArray = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export default function QueensBoard({
  activePool,
  onAddGuest,
  onRemoveGuest,
}: {
  activePool: Player[];
  onAddGuest: (tier: 'Stark' | 'Mittel' | 'Schwach') => void;
  onRemoveGuest: (guestNum: number) => void;
}) {
  const [groupSize, setGroupSize] = useState<2 | 3>(3);
  const [teams, setTeams] = useState<QueensTeam[]>([]);
  const [history, setHistory] = useState<{ teams: QueensTeam[]; pointsLog: PointLog[] }[]>([]);
  const [pointsLog, setPointsLog] = useState<PointLog[]>([]);
  const [selected, setSelected] = useState<SwapSelection | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedBanner, setSavedBanner] = useState<boolean>(false);

  const getPlayer = (num: number) => activePool.find((p) => p.number === num) || null;

  const sortCaptainFirst = (playerNums: number[]) => {
    const isCaptainRole = (num: number) => {
      const role = activePool.find((p) => p.number === num)?.role;
      return role === 'Pass' || role === 'Libera';
    };
    return [...playerNums].sort((a, b) => {
      const aCap = isCaptainRole(a) ? 0 : 1;
      const bCap = isCaptainRole(b) ? 0 : 1;
      return aCap - bCap;
    });
  };

  const assignedNumbers = useMemo(() => {
    const set = new Set<number>();
    teams.forEach((t) => t.players.forEach((n) => set.add(n)));
    return set;
  }, [teams]);

  const benchPlayers = useMemo(
    () => activePool.filter((p) => !assignedNumbers.has(p.number)),
    [activePool, assignedNumbers]
  );

  // SMART SHUFFLE WITH ROLE CONSTRAINTS
  const handleSmartShuffle = () => {

    const numTeams = Math.floor(activePool.length / groupSize);
    if (numTeams < 2) {
      alert(`Mindestens ${groupSize * 2} Spielerinnen benötigt für ${groupSize}er Queens!`);
      return;
    }

    const hitters = shuffleArray(activePool.filter((p) => p.role === 'Dia' || p.role === 'Neben'));
    const passes = shuffleArray(activePool.filter((p) => p.role === 'Pass'));
    const liberas = shuffleArray(activePool.filter((p) => p.role === 'Libera'));
    const middles = shuffleArray(activePool.filter((p) => p.role === 'Mitte'));
    const flex = shuffleArray(
      activePool.filter((p) => !['Dia', 'Neben', 'Pass', 'Libera', 'Mitte'].includes(p.role))
    );

    const buckets: Player[][] = Array.from({ length: numTeams }, () => []);
    const hasRole = (bucket: Player[], role: string) => bucket.some((p) => p.role === role);

    // 1. Every team gets 1 Dia/Neben (fallback to flex if not enough hitters)
    for (let i = 0; i < numTeams; i++) {
      const p = hitters.pop() || flex.pop();
      if (p) buckets[i].push(p);
    }

    // 2. Priority: 1 Pass OR 1 Libera per team
    const ballControl = shuffleArray([...passes, ...liberas]);
    const leftoverPassLib: Player[] = [];
    for (let i = 0; i < numTeams; i++) {
      if (buckets[i].length < groupSize && ballControl.length > 0) {
        buckets[i].push(ballControl.pop()!);
      }
    }
    leftoverPassLib.push(...ballControl);

    // 3. Extra Pass/Libera: pair Pass + Libera (no duplicates, no Mitte)
    const remainingOverflow: Player[] = [];
    leftoverPassLib.forEach((p) => {
      const target = buckets.find(
        (b) =>
          b.length < groupSize &&
          !hasRole(b, p.role) &&
          !hasRole(b, 'Mitte')
      );
      if (target) {
        target.push(p);
      } else {
        remainingOverflow.push(p);
      }
    });

    // 4. Priority: 1 Mitte per team (never on a team that already has both Pass + Libera)
    const leftoverMiddles: Player[] = [];
    middles.forEach((m) => {
      const target = buckets.find(
        (b) =>
          b.length < groupSize &&
          !hasRole(b, 'Mitte') &&
          !(hasRole(b, 'Pass') && hasRole(b, 'Libera'))
      );
      if (target) {
        target.push(m);
      } else {
        leftoverMiddles.push(m);
      }
    });

    // 5. Fill any remaining open slots: Hitters -> Flex -> Leftovers
    const fillPool = [...hitters, ...flex, ...remainingOverflow, ...leftoverMiddles];
    for (const p of fillPool) {
      const openBucket =
        buckets.find((b) => b.length < groupSize && !hasRole(b, p.role)) ||
        buckets.find((b) => b.length < groupSize);
      if (openBucket) {
        openBucket.push(p);
      }
    }

    const newTeams: QueensTeam[] = shuffleArray(buckets).map((bucket, idx) => ({
      id: `q-${Date.now()}-${idx}`,
      name: `Team ${idx + 1}`,
      players: sortCaptainFirst(bucket.map((p) => p.number)),
      points: 0,
    }));

    setTeams(newTeams);
    setHistory([]);
    setPointsLog([]);
    setSelected(null);
    setSavedBanner(false);
  };

  // PURE RANDOM SHUFFLE
  const handleRandomShuffle = () => {
    const numFullTeams = Math.floor(activePool.length / groupSize);
    if (numFullTeams < 2) {
      alert(`Mindestens ${groupSize * 2} Spielerinnen benötigt für ${groupSize}er Queens!`);
      return;
    }

    const shuffled = shuffleArray(activePool);
    const newTeams: QueensTeam[] = [];

    for (let i = 0; i < numFullTeams; i++) {
      const slice = shuffled.slice(i * groupSize, (i + 1) * groupSize);
      newTeams.push({
        id: `q-${Date.now()}-${i}`,
        name: `Team ${i + 1}`,
        players: sortCaptainFirst(slice.map((p) => p.number)), 
        points: 0,
      });
    }

    setTeams(newTeams);
    setHistory([]);
    setPointsLog([]);
    setSelected(null);
    setSavedBanner(false);
  };

  const createTeamFromBench = () => {
    if (benchPlayers.length === 0) return;
    const take = benchPlayers.slice(0, groupSize).map((p) => p.number);
    setTeams((prev) => [
      ...prev,
      {
        id: `q-${Date.now()}-extra`,
        name: `Team ${prev.length + 1}`,
        players: sortCaptainFirst(take),
        points: 0,
      },
    ]);
  };

  const removeTeam = (teamId: string) => {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
  };

  // QUEEN +1 POINT
  const addQueenPoint = () => {
    if (teams.length === 0) return;
    const queen = teams[0];

    setHistory((prev) => [...prev, { teams, pointsLog }]);

    const updatedQueen: QueensTeam = { ...queen, points: queen.points + 1 };
    const nextTeams = [updatedQueen, ...teams.slice(1)];

    setTeams(nextTeams);
    setPointsLog((prev) => [
      ...prev,
      {
        winner: 'A',
        scoreA: updatedQueen.points,
        scoreB: 0,
        teamA: queen.players,
        teamB: [],
        timestamp: new Date().toISOString(),
      },
    ]);
    setSavedBanner(false);
  };

  const subtractTeamPoint = (teamId: string) => {
    const target = teams.find((t) => t.id === teamId);
    if (!target) return;

    const newPoints = target.points - 1;
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, points: newPoints } : t))
    );
    setPointsLog((prev) => [
      ...prev,
      {
        winner: 'B', // B = Punkt-Abzug (z.B. Servicefehler)
        scoreA: newPoints,
        scoreB: 0,
        teamA: target.players,
        teamB: [],
        timestamp: new Date().toISOString(),
      },
    ]);
    setSavedBanner(false);
  };

  // PUT ANY TEAM INTO THE QUEEN FIELD
  const makeQueen = (teamIndex: number) => {
    if (teamIndex <= 0 || teamIndex >= teams.length) return;
    setHistory((prev) => [...prev, { teams, pointsLog }]);
    const copy = [...teams];
    const [newQueen] = copy.splice(teamIndex, 1);
    const oldQueen = copy.shift()!;
    setTeams([newQueen, ...copy, oldQueen]);
  };

  const undoLastAction = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setTeams(last.teams);
    setPointsLog(last.pointsLog);
    setHistory((prev) => prev.slice(0, -1));
  };

  // 2-TAP PLAYER SWAP
  const handlePlayerTap = (target: SwapSelection) => {
    if (!selected) {
      setSelected(target);
      return;
    }

    if (selected.playerNumber === target.playerNumber) {
      setSelected(null);
      return;
    }

    if (selected.kind === 'bench' && target.kind === 'bench') {
      setSelected(target);
      return;
    }

    setTeams((prev) =>
      prev.map((team) => {
        const nextPlayers = team.players.map((num) => {
          if (selected.kind === 'team' && team.id === selected.teamId && num === selected.playerNumber) {
            return target.playerNumber;
          }
          if (target.kind === 'team' && team.id === target.teamId && num === target.playerNumber) {
            return selected.playerNumber;
          }
          return num;
        });
        return { ...team, players: nextPlayers };
      })
    );
    setSelected(null);
  };

  // MOVE SELECTED PLAYER TO ANOTHER TEAM WITHOUT SWAPPING
  const moveSelectedToTeam = (targetTeamId: string) => {
    if (!selected) return;
    if (selected.kind === 'team' && selected.teamId === targetTeamId) return;

    const playerNum = selected.playerNumber;
    setTeams((prev) =>
      prev.map((team) => {
        if (selected.kind === 'team' && team.id === selected.teamId) {
          return { ...team, players: team.players.filter((n) => n !== playerNum) };
        }
        if (team.id === targetTeamId && !team.players.includes(playerNum)) {
          return { ...team, players: [...team.players, playerNum] };
        }
        return team;
      })
    );
    setSelected(null);
  };

  // MOVE SELECTED PLAYER TO BENCH WITHOUT SWAPPING
  const sendSelectedToBench = () => {
    if (!selected || selected.kind !== 'team') return;
    setTeams((prev) =>
      prev.map((t) =>
        t.id === selected.teamId
          ? { ...t, players: t.players.filter((n) => n !== selected.playerNumber) }
          : t
      )
    );
    setSelected(null);
  };

  const saveQueensGame = async () => {
    if (pointsLog.length === 0) {
      alert('Noch keine Punkte gespielt!');
      return;
    }
    setIsSaving(true);
    try {
      const leaderboard = [...teams]
        .sort((a, b) => b.points - a.points)
        .map((t) => ({
          teamName: t.name,
          players: t.players,
          points: t.points,
        }));

      const res = await fetch('/api/training-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: `queens-${groupSize}v${groupSize}`,
          finalScoreA: pointsLog.length,
          finalScoreB: 0,
          checkInSnapshot: activePool.map((p) => ({
            shirtNumber: p.number,
            name: p.name,
            role: p.role,
            mental: p.mental,
            physical: p.physical,
          })),
          points: pointsLog,
          queensLeaderboard: leaderboard,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPointsLog([]);
        setHistory([]);
        setTeams((prev) => prev.map((t) => ({ ...t, points: 0 })));
        setSavedBanner(true);
      } else {
        alert(data.error || 'Fehler beim Speichern.');
      }
    } catch {
      alert('Verbindungsfehler beim Speichern.');
    } finally {
      setIsSaving(false);
    }
  };

  const queenTeam = teams[0] || null;
  const otherTeams = teams.slice(1);
  const leaderboard = useMemo(() => [...teams].sort((a, b) => b.points - a.points), [teams]);
  const isTeamPlayerSelected = selected?.kind === 'team';

  const canMoveToTeam = (teamId: string) =>
    selected !== null && !(selected.kind === 'team' && selected.teamId === teamId);

  const renderPlayerPill = (teamId: string, num: number, isAnchor = false) => {
    const p = getPlayer(num);
    if (!p) return null;
    const isSel = selected?.kind === 'team' && selected.playerNumber === num;
    return (
      <button
        key={num}
        onClick={() => handlePlayerTap({ kind: 'team', teamId, playerNumber: num })}
        className={`relative px-3 py-2 rounded-xl border-2 flex items-center gap-2 transition-all ${
          isSel
            ? 'ring-2 ring-white scale-105 ' + getRoleColors(p.role)
            : isAnchor
            ? getRoleColors(p.role) + ' ring-1 ring-amber-300/80 shadow-md hover:scale-[1.02]'
            : getRoleColors(p.role) + ' opacity-85 hover:opacity-100 hover:scale-[1.02]'
        }`}
      >
        {isAnchor && (
          <span className="text-amber-300 text-xs leading-none -ml-0.5" title="Team-Anker">
            ★
          </span>
        )}
        <span className="font-black text-base">{p.number < 0 ? '👤' : `#${p.number}`}</span>
        <div className="text-left leading-tight">
          <div className={`text-xs ${isAnchor ? 'font-black text-white' : 'font-bold'}`}>
            {p.name}
          </div>
          <div className="text-[10px] opacity-70">{p.role}</div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase text-slate-400">Teamgrösse:</span>
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs font-bold">
            <button
              onClick={() => setGroupSize(2)}
              className={`px-3 py-1.5 rounded-lg ${groupSize === 2 ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'}`}
            >
              2er
            </button>
            <button
              onClick={() => setGroupSize(3)}
              className={`px-3 py-1.5 rounded-lg ${groupSize === 3 ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'}`}
            >
              3er
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSmartShuffle}
            className="bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black shadow transition-all"
          >
            🎲 Smart Shuffle
          </button>
          <button
            onClick={handleRandomShuffle}
            className="bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black shadow transition-all"
          >
            🔀 Random
          </button>
          <button
            onClick={saveQueensGame}
            disabled={isSaving || pointsLog.length === 0}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs sm:text-sm font-black disabled:opacity-30"
          >
            {isSaving ? 'Speichere...' : '💾 Speichern'}
          </button>
        </div>
      </div>

      {savedBanner && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl text-sm font-bold text-center">
          ✅ Queens-Spiel gespeichert!
        </div>
      )}

      {selected && (
        <div className="bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-xs font-bold px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <span>
            Ausgewählt — Tippe eine Spielerin zum <strong>Tauschen</strong> oder <strong>+ Hierher</strong> zum Verschieben.
          </span>
          {isTeamPlayerSelected && (
            <button
              onClick={sendSelectedToBench}
              className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg font-black"
            >
              ⬇️ Auf Bank
            </button>
          )}
        </div>
      )}

      {/* Queen Field + +1 Button */}
      {!queenTeam ? (
        <div className="bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-3xl p-12 text-center text-slate-400">
          <p className="text-lg font-bold text-white mb-2">👑 Queens Court bereit</p>
          <p className="text-sm">
            Wähle <strong>2er</strong> oder <strong>3er</strong> und klicke <strong>Smart Shuffle</strong> oder <strong>Random</strong>.
          </p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4">
          {/* QUEEN FIELD */}
          <div className="flex-1 bg-amber-500/10 border-2 border-amber-400/60 rounded-3xl p-5 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-sm font-black uppercase tracking-widest text-amber-300">
                  👑 Queen Feld
                </span>
                <span className="ml-3 text-xs font-bold text-slate-400">
                  {queenTeam.name} ({queenTeam.players.length})
                </span>
              </div>
              <span className="bg-amber-400 text-slate-950 font-black text-2xl px-4 py-1 rounded-xl">
                {queenTeam.points} Pkt
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {queenTeam.players.map((num, idx) => renderPlayerPill(queenTeam.id, num, idx === 0))}
              {canMoveToTeam(queenTeam.id) && (
                <button
                  onClick={() => moveSelectedToTeam(queenTeam.id)}
                  className="px-3.5 py-2.5 rounded-xl border-2 border-dashed border-emerald-400/70 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/30 text-xs font-black transition-all"
                >
                  + Hierher
                </button>
              )}
            </div>
          </div>

          {/* +1 BUTTON NEXT TO QUEEN FIELD */}
          <button
            onClick={addQueenPoint}
            className="md:w-44 py-6 md:py-0 bg-amber-500 hover:bg-amber-400 active:scale-[0.97] text-slate-950 rounded-3xl font-black text-4xl shadow-xl transition-all flex flex-col items-center justify-center"
          >
            <span>+1</span>
            <span className="text-xs uppercase tracking-widest mt-1 font-extrabold">Punkt</span>
          </button>
        </div>
      )}

      {/* Other Teams Beneath + Leaderboard */}
      {teams.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Other Teams */}
          <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700 rounded-3xl p-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
              Andere Teams ({otherTeams.length}) — Tippe &quot;→ 👑 Queen&quot; zum Einwechseln
            </h3>
            <div className="space-y-3">
              {otherTeams.map((team, idx) => {
                const realIdx = idx + 1;
                return (
                  <div
                    key={team.id}
                    className="bg-slate-900/60 border border-slate-700 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-slate-400 w-16">
                        {team.points} Pkt
                      </span>
                      {team.players.map((num, idx) => renderPlayerPill(team.id, num, idx === 0))}
                      {canMoveToTeam(team.id) && (
                        <button
                          onClick={() => moveSelectedToTeam(team.id)}
                          className="px-3 py-2 rounded-xl border-2 border-dashed border-emerald-400/70 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/30 text-xs font-black transition-all"
                        >
                          + Hierher
                        </button>
                      )}
                      {team.players.length === 0 && (
                        <span className="text-xs text-slate-500 italic">Leer</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {team.players.length === 0 && (
                        <button
                          onClick={() => removeTeam(team.id)}
                          title="Leeres Team löschen"
                          className="px-2.5 py-2 rounded-xl bg-red-500/20 border border-red-400/40 text-red-300 hover:bg-red-500 hover:text-white text-xs font-black"
                        >
                          ✕
                        </button>
                      )}
                      <button
                        onClick={() => makeQueen(realIdx)}
                        disabled={team.players.length === 0}
                        className="px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-200 hover:bg-amber-500 hover:text-slate-950 font-black text-xs transition-all disabled:opacity-30"
                      >
                        → 👑 Queen
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
              🏆 Rangliste
            </h3>
            <div className="space-y-2">
              {leaderboard.map((t, idx) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between bg-slate-900/60 border border-slate-700/70 rounded-xl px-3 py-2"
                >
                  <div className="truncate pr-2">
                    <span className="text-xs font-black text-amber-400 mr-2">{idx + 1}.</span>
                    <span className="text-xs font-bold text-slate-200">
                      {t.players.length > 0
                        ? `★ ${getPlayer(t.players[0])?.name || `#${t.players[0]}`}`
                        : '(Leer)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-black text-white w-6 text-right">
                      {t.points}
                    </span>
                    <button
                      onClick={() => subtractTeamPoint(t.id)}
                      title="1 Punkt abziehen (z.B. Servicefehler)"
                      className="px-2 py-1 rounded-lg bg-red-500/20 border border-red-400/40 text-red-300 hover:bg-red-500 hover:text-white active:scale-95 text-xs font-black transition-all"
                    >
                      -1
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bench & Guest Dummies */}
      <div
        onClick={() => {
          if (isTeamPlayerSelected) sendSelectedToBench();
        }}
        className={`bg-slate-800/60 border-2 rounded-3xl p-5 transition-all ${
          isTeamPlayerSelected
            ? 'border-red-500/60 bg-red-500/5 cursor-pointer'
            : 'border-slate-700'
        }`}
      >
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
              Bank / Übrig ({benchPlayers.length})
              {isTeamPlayerSelected && (
                <span className="ml-2 text-red-400">— Hier tippen zum Auswechseln</span>
              )}
            </h3>
            {benchPlayers.length > 0 && (
              <button
                onClick={createTeamFromBench}
                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-600/30 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-600/50"
              >
                + Team aus Bank
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">+ Gast:</span>
            {(['Stark', 'Mittel', 'Schwach'] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => onAddGuest(tier)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-700/70 border border-slate-500/50 text-slate-200 hover:bg-slate-600"
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {benchPlayers.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Alle Spielerinnen sind in Teams eingeteilt.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
          {benchPlayers.map((player) => {
            const isGuest = player.number < 0;
            const isSel = selected?.kind === 'bench' && selected.playerNumber === player.number;
            return (
              <div
                key={player.number}
                className={`rounded-xl border-2 flex items-center transition-all ${
                  isSel ? 'ring-2 ring-white scale-105 ' + getRoleColors(player.role) : getRoleColors(player.role)
                }`}
              >
                <button
                  onClick={() => handlePlayerTap({ kind: 'bench', playerNumber: player.number })}
                  className="px-3 py-2 flex items-center gap-2 text-left"
                >
                  <span className="font-black text-base">{isGuest ? '👤' : `#${player.number}`}</span>
                  <div>
                    <div className="text-xs font-bold leading-tight">{player.name}</div>
                    <div className="text-[10px] opacity-70">{player.role}</div>
                  </div>
                </button>
                {isGuest && (
                  <button
                    onClick={() => onRemoveGuest(player.number)}
                    className="pr-2.5 pl-1 py-2 text-xs opacity-60 hover:opacity-100 hover:text-red-400 font-black"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}

          {isTeamPlayerSelected && (
            <button
              onClick={sendSelectedToBench}
              className="px-3.5 py-2.5 rounded-xl border-2 border-dashed border-red-400/70 bg-red-500/15 text-red-200 hover:bg-red-500/30 text-xs font-black transition-all"
            >
              + Hierher (Bank)
            </button>
          )}

          {benchPlayers.length === 0 && !isTeamPlayerSelected && (
            <p className="text-xs text-slate-500 italic">Alle Spielerinnen sind in Teams eingeteilt.</p>
          )}
        </div>
        )}
      </div>
    </div>
  );
}