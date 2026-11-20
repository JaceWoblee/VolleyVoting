'use client';

import { useState, useMemo } from 'react';
import QueensBoard from './QueensBoard';

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

interface Player {
  name: string;
  number: number; // Negative numbers (-1, -2, ...) = Guest Dummies
  role: string;
  mental: number;
  physical: number;
}

interface PointLog {
  winner: 'A' | 'B';
  scoreA: number;
  scoreB: number;
  teamA: number[];
  teamB: number[];
  servingTeam?: 'A' | 'B' | null;
  server?: number | null;
  isEighthBall?: boolean;
  clutchScorer?: number | null;
  clutchIsError?: boolean;
  timestamp: string;
}

type SlotTarget =
  | { zone: 'A'; index: number }
  | { zone: 'B'; index: number }
  | { zone: 'bench'; playerNumber: number };

const COURT_POSITIONS = [
  { label: 'Pos 4', idx: 0 }, { label: 'Pos 3', idx: 1 }, { label: 'Pos 2', idx: 2 },
  { label: 'Pos 5', idx: 3 }, { label: 'Pos 6', idx: 4 }, { label: 'Pos 1', idx: 5 },
];

const ROLE_SLOT_PREFERENCE: Record<string, number[]> = {
  Mitte: [1, 0, 2, 4, 3, 5],
  Libera: [4, 3, 5, 1, 0, 2],
  Pass: [2, 5, 0, 3, 1, 4],
  Dia: [5, 2, 0, 3, 1, 4],
  Neben: [0, 3, 2, 5, 1, 4],
  Unassigned: [0, 1, 2, 3, 4, 5],
};

function placePlayersByRole(players: Player[]): (number | null)[] {
  const court: (number | null)[] = [null, null, null, null, null, null];
  const order = ['Mitte', 'Libera', 'Pass', 'Dia', 'Neben', 'Unassigned'];

  const sorted = [...players].sort(
    (a, b) =>
      (order.indexOf(a.role) === -1 ? 99 : order.indexOf(a.role)) -
      (order.indexOf(b.role) === -1 ? 99 : order.indexOf(b.role))
  );

  sorted.forEach((player) => {
    const prefs = ROLE_SLOT_PREFERENCE[player.role] || ROLE_SLOT_PREFERENCE.Unassigned;
    const openIdx = prefs.find((idx) => court[idx] === null);
    if (openIdx !== undefined) {
      court[openIdx] = player.number;
    }
  });

  return court;
}

export default function TrainingBoardClient({
  checkedInPlayers,
  allPlayers,
}: {
  checkedInPlayers: Player[];
  allPlayers: Player[];
}) {
  const [useFullRoster, setUseFullRoster] = useState<boolean>(checkedInPlayers.length === 0);
  const [guests, setGuests] = useState<Player[]>([]);
  const [nextGuestId, setNextGuestId] = useState<number>(-1);

  const activePool = useMemo(() => {
    const base = useFullRoster ? allPlayers : checkedInPlayers;
    return [...base, ...guests];
  }, [useFullRoster, allPlayers, checkedInPlayers, guests]);

    const [gameMode, setGameMode] = useState<'6v6' | 'queens' | '8ball'>('6v6');

  const [teamA, setTeamA] = useState<(number | null)[]>([null, null, null, null, null, null]);
  const [teamB, setTeamB] = useState<(number | null)[]>([null, null, null, null, null, null]);
  const [selectedSlot, setSelectedSlot] = useState<SlotTarget | null>(null);

  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [roundA, setRoundA] = useState<number>(0);
  const [roundB, setRoundB] = useState<number>(0);
  const [servingTeam, setServingTeam] = useState<'A' | 'B'>('A');
  const [serverNum, setServerNum] = useState<number | null>(null);
  const [clutchMode, setClutchMode] = useState<'point' | 'error'>('point');
  const [pointsLog, setPointsLog] = useState<PointLog[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedBanner, setSavedBanner] = useState<boolean>(false);
  const [scoreHistory, setScoreHistory] = useState<
    { scoreA: number; scoreB: number; roundA: number; roundB: number; servingTeam: 'A' | 'B' }[]
  >([]);

  const getPlayer = (num: number | null) =>
    num === null ? null : activePool.find((p) => p.number === num) || null;

  const assignedNumbers = useMemo(() => {
    const set = new Set<number>();
    teamA.forEach((n) => n !== null && set.add(n));
    teamB.forEach((n) => n !== null && set.add(n));
    return set;
  }, [teamA, teamB]);

  const benchPlayers = useMemo(
    () => activePool.filter((p) => !assignedNumbers.has(p.number)),
    [activePool, assignedNumbers]
  );

  // GUEST DUMMY HELPERS
  const addGuest = (tier: 'Stark' | 'Mittel' | 'Schwach') => {
    const guestNum = nextGuestId;
    const guestIndex = Math.abs(guestNum);
    const newGuest: Player = {
      name: `Gast ${guestIndex}`,
      number: guestNum,
      role: `Gast (${tier})`,
      mental: 5,
      physical: 5,
    };
    setGuests((prev) => [...prev, newGuest]);
    setNextGuestId((prev) => prev - 1);
  };

  const removeGuest = (guestNum: number) => {
    setGuests((prev) => prev.filter((g) => g.number !== guestNum));
    setTeamA((prev) => prev.map((n) => (n === guestNum ? null : n)));
    setTeamB((prev) => prev.map((n) => (n === guestNum ? null : n)));
    setSelectedSlot(null);
  };

  // SEND SELECTED COURT PLAYER TO BENCH
  const sendSelectedToBench = () => {
    if (!selectedSlot || selectedSlot.zone === 'bench') return;
    if (selectedSlot.zone === 'A') {
      const nextA = [...teamA];
      nextA[selectedSlot.index] = null;
      setTeamA(nextA);
    } else if (selectedSlot.zone === 'B') {
      const nextB = [...teamB];
      nextB[selectedSlot.index] = null;
      setTeamB(nextB);
    }
    setSelectedSlot(null);
  };

  // SMART ROLE-BALANCED RANDOMIZER (Quota-first, then surplus fill)
  const smartSplitTeams = () => {
    const TEAM_QUOTA: Record<string, number> = {
      Pass: 1,
      Mitte: 1,
      Libera: 1,
      Dia: 1,
      Neben: 2,
    };
    const coreRoles = ['Pass', 'Mitte', 'Libera', 'Dia', 'Neben'];

    const shuffle = <T,>(arr: T[]): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const listA: Player[] = [];
    const listB: Player[] = [];
    const surplus: Player[] = [];
    let dealToAFirst = Math.random() < 0.5;

    coreRoles.forEach((role) => {
      const quota = TEAM_QUOTA[role];
      const playersInRole = shuffle(activePool.filter((p) => p.role === role));
      let countA = 0;
      let countB = 0;

      playersInRole.forEach((player) => {
        const canA = countA < quota && listA.length < 6;
        const canB = countB < quota && listB.length < 6;

        if (!canA && !canB) {
          surplus.push(player);
          return;
        }

        if (canA && !canB) {
          listA.push(player);
          countA++;
        } else if (canB && !canA) {
          listB.push(player);
          countB++;
        } else if (countA < countB) {
          listA.push(player);
          countA++;
        } else if (countB < countA) {
          listB.push(player);
          countB++;
        } else {
          if (listA.length < listB.length) {
            listA.push(player);
            countA++;
          } else if (listB.length < listA.length) {
            listB.push(player);
            countB++;
          } else if (dealToAFirst) {
            listA.push(player);
            countA++;
            dealToAFirst = false;
          } else {
            listB.push(player);
            countB++;
            dealToAFirst = true;
          }
        }
      });
    });

    activePool
      .filter((p) => !coreRoles.includes(p.role))
      .forEach((p) => surplus.push(p));

    shuffle(surplus).forEach((player) => {
      if (listA.length >= 6 && listB.length >= 6) return;

      if (listA.length < listB.length) {
        listA.push(player);
      } else if (listB.length < listA.length) {
        listB.push(player);
      } else if (dealToAFirst) {
        listA.push(player);
        dealToAFirst = false;
      } else {
        listB.push(player);
        dealToAFirst = true;
      }
    });

    setTeamA(placePlayersByRole(listA));
    setTeamB(placePlayersByRole(listB));
    setSelectedSlot(null);
  };

  // 2-TAP SWAP LOGIC
  const getSlotValue = (slot: SlotTarget): number | null => {
    if (slot.zone === 'A') return teamA[slot.index];
    if (slot.zone === 'B') return teamB[slot.index];
    return slot.playerNumber;
  };

  const isSameSlot = (a: SlotTarget | null, b: SlotTarget): boolean => {
    if (!a || a.zone !== b.zone) return false;
    if (a.zone === 'A' && b.zone === 'A') return a.index === b.index;
    if (a.zone === 'B' && b.zone === 'B') return a.index === b.index;
    if (a.zone === 'bench' && b.zone === 'bench') return a.playerNumber === b.playerNumber;
    return true;
  };

  const handleSlotClick = (target: SlotTarget) => {
    if (!selectedSlot) {
      setSelectedSlot(target);
      return;
    }

    if (isSameSlot(selectedSlot, target)) {
      setSelectedSlot(null);
      return;
    }

    if (selectedSlot.zone === 'bench' && target.zone === 'bench') {
      setSelectedSlot(target);
      return;
    }

    const val1 = getSlotValue(selectedSlot);
    const val2 = getSlotValue(target);

    const nextA = [...teamA];
    const nextB = [...teamB];

    const writeSlot = (slot: SlotTarget, val: number | null) => {
      if (slot.zone === 'A') nextA[slot.index] = val;
      else if (slot.zone === 'B') nextB[slot.index] = val;
    };

    if (selectedSlot.zone === 'bench') {
      writeSlot(target, val1);
    } else if (target.zone === 'bench') {
      writeSlot(selectedSlot, val2);
    } else {
      writeSlot(selectedSlot, val2);
      writeSlot(target, val1);
    }

    setTeamA(nextA);
    setTeamB(nextB);
    setSelectedSlot(null);
  };

  // SCORE & LOGGING (supports both 6v6 Standard and 8-Ball)
  const addPoint = (
    winner: 'A' | 'B',
    clutchScorer: number | null = null,
    clutchIsError = false
  ) => {
    const activeA = teamA.filter((n): n is number => n !== null);
    const activeB = teamB.filter((n): n is number => n !== null);

    if (activeA.length === 0 || activeB.length === 0) {
      alert('Bitte stelle zuerst beide Teams auf (oder nutze Smart Split)!');
      return;
    }

    setScoreHistory((prev) => [...prev, { scoreA, scoreB, roundA, roundB, servingTeam }]);

    let newScoreA = scoreA;
    let newScoreB = scoreB;
    const isEightBall = gameMode === '8ball';
    const ballsPlayed = roundA + roundB;
    const isDecider = isEightBall && ballsPlayed === 7;
    const isServeBall = isDecider;

    const resolvedServer = isServeBall ? serverNum : null;

    if (isEightBall) {
      if (ballsPlayed < 7) {
        if (winner === 'A') setRoundA((r) => r + 1);
        else setRoundB((r) => r + 1);
        if (ballsPlayed === 0) setServerNum(null);
      } else {
        if (winner === 'A') newScoreA += roundA;
        else newScoreB += roundB;

        setScoreA(newScoreA);
        setScoreB(newScoreB);
        setRoundA(0);
        setRoundB(0);
        setServerNum(null);
        setClutchMode('point');
      }
    } else {
      newScoreA = winner === 'A' ? scoreA + 1 : scoreA;
      newScoreB = winner === 'B' ? scoreB + 1 : scoreB;
      setScoreA(newScoreA);
      setScoreB(newScoreB);
    }

    setPointsLog((prev) => [
      ...prev,
      {
        winner,
        scoreA: newScoreA,
        scoreB: newScoreB,
        teamA: activeA,
        teamB: activeB,
        servingTeam: isServeBall ? servingTeam : null,
        server: resolvedServer,
        isEighthBall: isDecider,
        clutchScorer: isDecider ? clutchScorer : null,
        clutchIsError: isDecider ? clutchIsError : false,
        timestamp: new Date().toISOString(),
      },
    ]);
    setSavedBanner(false);
  };

  const undoLastPoint = () => {
    if (pointsLog.length === 0) return;
    setPointsLog((prev) => prev.slice(0, -1));

    if (scoreHistory.length > 0) {
      const prev = scoreHistory[scoreHistory.length - 1];
      setScoreA(prev.scoreA);
      setScoreB(prev.scoreB);
      setRoundA(prev.roundA);
      setRoundB(prev.roundB);
      setServingTeam(prev.servingTeam);
      setScoreHistory((h) => h.slice(0, -1));
    }
  };

  const saveGame = async () => {
    if (pointsLog.length === 0) {
      alert('Noch keine Punkte gespielt!');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/training-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: gameMode,
          finalScoreA: scoreA,
          finalScoreB: scoreB,
          checkInSnapshot: activePool.map((p) => ({
            shirtNumber: p.number,
            name: p.name,
            role: p.role,
            mental: p.mental,
            physical: p.physical,
          })),
          points: pointsLog,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setScoreA(0);
        setScoreB(0);
        setRoundA(0);
        setRoundB(0);
        setScoreHistory([]);
        setPointsLog([]);
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

  const isCourtPlayerSelected =
    selectedSlot !== null &&
    selectedSlot.zone !== 'bench' &&
    getSlotValue(selectedSlot) !== null;

  const renderCourtSide = (side: 'A' | 'B', slots: (number | null)[]) => {
    const isA = side === 'A';
    const accent = isA ? 'text-indigo-400 border-indigo-500/40' : 'text-amber-400 border-amber-500/40';

    return (
      <div className={`flex-1 bg-slate-800/60 border-2 rounded-3xl p-4 sm:p-5 flex flex-col items-center ${accent}`}>
        <div className="w-full flex justify-between items-center mb-3">
          <h2 className="text-lg font-black uppercase tracking-widest">
            {isA ? '🔵 Team A' : '🟠 Team B'}
          </h2>
          <span className="text-xs font-bold text-slate-400">
            {slots.filter(Boolean).length} / 6 Feld
          </span>
        </div>

        <div className="w-full h-3 bg-slate-200 rounded-t-md border-b-2 border-slate-400 mb-2 flex items-center justify-center">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.5em]">Netz</span>
        </div>

        <div className="w-full grid grid-cols-3 grid-rows-2 gap-2.5 bg-slate-900/50 p-3 rounded-b-xl border border-slate-700">
          {COURT_POSITIONS.map((pos) => {
            const slotTarget: SlotTarget = { zone: side, index: pos.idx };
            const player = getPlayer(slots[pos.idx]);
            const selected = isSameSlot(selectedSlot, slotTarget);

            return (
              <button
                key={pos.idx}
                onClick={() => handleSlotClick(slotTarget)}
                className={`relative h-24 rounded-2xl border-2 flex flex-col items-center justify-center transition-all p-1 ${
                  selected
                    ? 'ring-2 ring-white scale-105 z-10 shadow-xl ' +
                      (player ? getRoleColors(player.role) : 'bg-indigo-500/30 border-white text-white')
                    : player
                    ? getRoleColors(player.role) + ' hover:scale-[1.03]'
                    : 'bg-slate-900/60 border-dashed border-slate-700 text-slate-600 hover:border-slate-500'
                }`}
              >
                <span className="absolute top-1 left-2 text-[9px] font-bold uppercase opacity-50">
                  {pos.label}
                </span>
                {player ? (
                  <>
                    <span className="text-2xl font-black leading-none mt-1">
                      {player.number < 0 ? '👤' : `#${player.number}`}
                    </span>
                    <span className="text-[11px] font-bold uppercase truncate max-w-[90%]">
                      {player.name}
                    </span>
                    <span className="text-[9px] opacity-70">{player.role}</span>
                  </>
                ) : (
                  <span className="text-2xl font-bold">+</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Bar */}
        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-wide">🏐 Training Game Board</h1>
            <p className="text-xs text-slate-400 mt-1">
              {useFullRoster
                ? `Test-Modus: Ganzer Kader (${activePool.length})`
                : `Heute eingecheckt: ${activePool.length}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
              <button
                onClick={() => setGameMode('6v6')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  gameMode === '6v6' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                6v6 Standard
              </button>
              <button
                onClick={() => setGameMode('queens')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  gameMode === 'queens' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                👑 Queens
              </button>
              <button
                onClick={() => setGameMode('8ball')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  gameMode === '8ball' ? 'bg-fuchsia-600 text-white font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                🎱 8-Ball
              </button>
            </div>

            <button
              onClick={() => setUseFullRoster((prev) => !prev)}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl text-xs font-bold text-slate-300"
            >
              {useFullRoster ? 'Check-ins' : 'Alle'}
            </button>

            {gameMode !== 'queens' && (
              <button
                onClick={smartSplitTeams}
                className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl text-sm font-black shadow-lg transition-all"
              >
                🎲 Smart Split
              </button>
            )}
          </div>
        </div>

        {/* Mode Content */}
        {gameMode === 'queens' ? (
          <QueensBoard
            activePool={activePool}
            onAddGuest={addGuest}
            onRemoveGuest={removeGuest}
          />
        ) : (
          <>
            {savedBanner && (
              <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl text-sm font-bold text-center">
                ✅ Spiel gespeichert! Alle Punkte & Aufstellungen sind in der Datenbank.
              </div>
            )}

            {/* Scoreboard */}
            {(() => {
              const isEightBall = gameMode === '8ball';
              const ballsPlayed = roundA + roundB;
              const isDecider = isEightBall && ballsPlayed === 7;
              const isServeBall = isDecider;
              const needsServerPick = isServeBall && serverNum === null;
              const leader = roundA > roundB ? 'Team A' : 'Team B';

              const activePlayersA = teamA
                .filter((n): n is number => n !== null)
                .map((n) => getPlayer(n))
                .filter((p): p is Player => p !== null);
              const activePlayersB = teamB
                .filter((n): n is number => n !== null)
                .map((n) => getPlayer(n))
                .filter((p): p is Player => p !== null);

              const hasTeams = activePlayersA.length > 0 && activePlayersB.length > 0;
              const currentServer = getPlayer(serverNum);

              const pickServer = (team: 'A' | 'B', num: number) => {
                setServingTeam(team);
                setServerNum(num);
              };

              const handleClutchTap = (playerTeam: 'A' | 'B', playerNum: number) => {
                const isError = clutchMode === 'error';
                // If player made an error, the OTHER team wins the 8th ball
                const winner: 'A' | 'B' = isError
                  ? playerTeam === 'A'
                    ? 'B'
                    : 'A'
                  : playerTeam;
                addPoint(winner, playerNum, isError);
              };

              return (
                <div
                  className={`border-2 rounded-3xl p-4 sm:p-6 shadow-xl transition-all space-y-4 ${
                    isDecider
                      ? 'bg-fuchsia-950/40 border-fuchsia-500/80'
                      : 'bg-slate-800/80 border-slate-700'
                  }`}
                >
                  {/* Top Meta Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
                    {isEightBall ? (
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                            isDecider
                              ? 'bg-fuchsia-500 text-white animate-pulse'
                              : 'bg-slate-900 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {isDecider
                            ? `🔥 8. BALL! ${leader} wählt`
                            : `🎱 Ball ${ballsPlayed + 1} / 8 ${ballsPlayed === 0 ? '(Service)' : '(Freeball)'}`}
                        </span>
                        <span className="text-sm font-black">
                          <span className="text-indigo-400">{roundA}</span>
                          <span className="text-slate-600 mx-1">:</span>
                          <span className="text-amber-400">{roundB}</span>
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                        6v6 Standard
                      </span>
                    )}

                    {/* Active Server Badge (tap to change) */}
                    {isServeBall && currentServer && (
                      <button
                        onClick={() => setServerNum(null)}
                        className="flex items-center gap-2 text-xs font-bold bg-slate-900 hover:bg-slate-700 border border-slate-600 px-3 py-1 rounded-full transition-all"
                      >
                        <span>
                          🏐 Service ({servingTeam === 'A' ? '🔵' : '🟠'}):{' '}
                          <strong className="text-white">
                            {currentServer.number < 0 ? currentServer.name : `#${currentServer.number} ${currentServer.name}`}
                          </strong>
                        </span>
                        <span className="text-slate-400">✕</span>
                      </button>
                    )}
                  </div>

                  {/* LAYER 1: SERVER PICKER (Ball 1 & Ball 8 in 8-Ball) */}
                  {needsServerPick && hasTeams ? (
                    <div className="space-y-4">
                      <p className="text-center text-xs font-black uppercase tracking-widest text-emerald-300">
                        🏐 Wer macht den Service? (Tippen zum Weitergehen)
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-2xl p-3 space-y-2">
                          <div className="text-xs font-black text-indigo-300">🔵 Service Team A</div>
                          <div className="flex flex-wrap gap-2">
                            {activePlayersA.map((p) => (
                              <button
                                key={p.number}
                                onClick={() => pickServer('A', p.number)}
                                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-black shadow transition-all"
                              >
                                {p.number < 0 ? p.name : `#${p.number} ${p.name}`}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-3 space-y-2">
                          <div className="text-xs font-black text-amber-300">🟠 Service Team B</div>
                          <div className="flex flex-wrap gap-2">
                            {activePlayersB.map((p) => (
                              <button
                                key={p.number}
                                onClick={() => pickServer('B', p.number)}
                                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black shadow transition-all"
                              >
                                {p.number < 0 ? p.name : `#${p.number} ${p.name}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center items-center gap-3">
                        <span className="text-xs font-bold text-slate-400">
                          Bank-Stand: <strong className="text-indigo-400">{scoreA}</strong> :{' '}
                          <strong className="text-amber-400">{scoreB}</strong>
                        </span>
                        {pointsLog.length > 0 && (
                          <>
                            <button
                              onClick={undoLastPoint}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600"
                            >
                              ↩ Undo ({pointsLog.length})
                            </button>
                            <button
                              onClick={saveGame}
                              disabled={isSaving}
                              className="text-xs font-black px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500"
                            >
                              💾 Speichern
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : isDecider ? (
                    /* LAYER 2 (BALL 8): CLUTCH SCORER / ERROR PICKER */
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <span className="text-xs font-black uppercase tracking-widest text-fuchsia-300">
                          8. Punkt durch:
                        </span>
                        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs font-black">
                          <button
                            onClick={() => setClutchMode('point')}
                            className={`px-3.5 py-1.5 rounded-lg transition-all ${
                              clutchMode === 'point'
                                ? 'bg-emerald-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            ✅ Punkt
                          </button>
                          <button
                            onClick={() => setClutchMode('error')}
                            className={`px-3.5 py-1.5 rounded-lg transition-all ${
                              clutchMode === 'error'
                                ? 'bg-red-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            ❌ Fehler
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Team A Players */}
                        <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-2xl p-3 space-y-2">
                          <div className="text-xs font-black text-indigo-300">
                            {clutchMode === 'point'
                              ? `🔵 Punkt Team A (+${roundA})`
                              : `🔵 Fehler Team A (→ Team B +${roundB})`}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {activePlayersA.map((p) => (
                              <button
                                key={p.number}
                                onClick={() => handleClutchTap('A', p.number)}
                                className={`px-3 py-2 rounded-xl active:scale-95 text-white text-xs font-black shadow transition-all ${
                                  clutchMode === 'error'
                                    ? 'bg-red-600/80 hover:bg-red-500'
                                    : 'bg-indigo-600 hover:bg-indigo-500'
                                }`}
                              >
                                {p.number < 0 ? p.name : `#${p.number} ${p.name}`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Team B Players */}
                        <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-3 space-y-2">
                          <div className="text-xs font-black text-amber-300">
                            {clutchMode === 'point'
                              ? `🟠 Punkt Team B (+${roundB})`
                              : `🟠 Fehler Team B (→ Team A +${roundA})`}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {activePlayersB.map((p) => (
                              <button
                                key={p.number}
                                onClick={() => handleClutchTap('B', p.number)}
                                className={`px-3 py-2 rounded-xl active:scale-95 text-xs font-black shadow transition-all ${
                                  clutchMode === 'error'
                                    ? 'bg-red-600/80 hover:bg-red-500 text-white'
                                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                }`}
                              >
                                {p.number < 0 ? p.name : `#${p.number} ${p.name}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => setServerNum(null)}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600"
                        >
                          ↩ Service ändern
                        </button>
                        <button
                          onClick={undoLastPoint}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600"
                        >
                          ↩ Undo (zurück zu Ball 7)
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* STANDARD SCOREBOARD (6v6 & 8-Ball Balls 1–7) */
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <button
                        onClick={() => addPoint('A')}
                        className="w-full sm:w-52 py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-2xl font-black text-xl shadow-lg transition-all"
                      >
                        +1 Team A
                      </button>

                      <div className="flex flex-col items-center">
                        {isEightBall && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                            Bank-Stand
                          </span>
                        )}
                        <div className="text-5xl sm:text-6xl font-black tracking-wider flex items-center gap-4">
                          <span className="text-indigo-400">{scoreA}</span>
                          <span className="text-slate-600 text-3xl">:</span>
                          <span className="text-amber-400">{scoreB}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <button
                            onClick={undoLastPoint}
                            disabled={pointsLog.length === 0}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30"
                          >
                            ↩ Undo ({pointsLog.length} Bälle)
                          </button>
                          <button
                            onClick={saveGame}
                            disabled={isSaving || pointsLog.length === 0}
                            className="text-xs font-black px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30"
                          >
                            {isSaving ? 'Speichere...' : '💾 Spiel speichern'}
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => addPoint('B')}
                        className="w-full sm:w-52 py-4 bg-amber-600 hover:bg-amber-500 active:scale-95 rounded-2xl font-black text-xl shadow-lg transition-all"
                      >
                        +1 Team B
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Hint & Send-to-Bench Action */}
            {selectedSlot && (
              <div className="bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-xs font-bold px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <span>
                  Tausch-Modus aktiv — Tippe eine andere Position an zum Tauschen (nochmal tippen zum Abbrechen).
                </span>
                {isCourtPlayerSelected && (
                  <button
                    onClick={sendSelectedToBench}
                    className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg font-black shadow-sm transition-all"
                  >
                    ⬇️ Auf Bank setzen
                  </button>
                )}
              </div>
            )}

            {/* Dual Courts */}
            <div className="flex flex-col lg:flex-row gap-6">
              {renderCourtSide('A', teamA)}
              {renderCourtSide('B', teamB)}
            </div>

            {/* Shared Bench + Guest Dummies */}
            <div
              onClick={() => {
                if (isCourtPlayerSelected) sendSelectedToBench();
              }}
              className={`bg-slate-800/60 border-2 rounded-3xl p-5 transition-all ${
                isCourtPlayerSelected
                  ? 'border-red-500/60 bg-red-500/5 cursor-pointer'
                  : 'border-slate-700'
              }`}
            >
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Bank / Verfügbar ({benchPlayers.length})
                  {isCourtPlayerSelected && (
                    <span className="ml-2 text-red-400">— Hier tippen zum Auswechseln</span>
                  )}
                </h3>

                {/* Add Guest Dummy Buttons */}
                <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">+ Gast:</span>
                  <button
                    onClick={() => addGuest('Stark')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-200 hover:bg-fuchsia-500/30"
                  >
                    Stark
                  </button>
                  <button
                    onClick={() => addGuest('Mittel')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/30"
                  >
                    Mittel
                  </button>
                  <button
                    onClick={() => addGuest('Schwach')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-600/40 border border-slate-400/40 text-slate-200 hover:bg-slate-600/60"
                  >
                    Schwach
                  </button>
                </div>
              </div>

              {benchPlayers.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Alle Spielerinnen sind auf dem Feld.</p>
              ) : (
                <div className="flex flex-wrap gap-2.5" onClick={(e) => e.stopPropagation()}>
                  {benchPlayers.map((player) => {
                    const slot: SlotTarget = { zone: 'bench', playerNumber: player.number };
                    const selected = isSameSlot(selectedSlot, slot);
                    const isGuest = player.number < 0;

                    return (
                      <div
                        key={player.number}
                        className={`rounded-xl border-2 flex items-center transition-all ${
                          selected
                            ? 'ring-2 ring-white scale-105 ' + getRoleColors(player.role)
                            : getRoleColors(player.role) + ' hover:scale-[1.03]'
                        }`}
                      >
                        <button
                          onClick={() => handleSlotClick(slot)}
                          className="px-3 py-2 flex items-center gap-2.5 text-left"
                        >
                          <span className="font-black text-base">
                            {isGuest ? '👤' : `#${player.number}`}
                          </span>
                          <div>
                            <div className="text-xs font-bold leading-tight">{player.name}</div>
                            <div className="text-[10px] opacity-70">{player.role}</div>
                          </div>
                          {!isGuest && (
                            <div className="flex gap-1 ml-1">
                              <span className="text-[10px] bg-slate-900/70 px-1.5 py-0.5 rounded">🧠 {player.mental}</span>
                              <span className="text-[10px] bg-slate-900/70 px-1.5 py-0.5 rounded">🔋 {player.physical}</span>
                            </div>
                          )}
                        </button>
                        {isGuest && (
                          <button
                            onClick={() => removeGuest(player.number)}
                            title="Gast entfernen"
                            className="pr-2.5 pl-1 py-2 text-xs opacity-60 hover:opacity-100 hover:text-red-400 font-black"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}