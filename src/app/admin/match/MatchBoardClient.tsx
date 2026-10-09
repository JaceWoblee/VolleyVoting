'use client';

import { useState, useMemo, useEffect } from 'react';

const getRoleColors = (role: string) => {
  switch (role) {
    case 'Pass': return 'bg-blue-500/10 border-blue-500/30 text-blue-200';
    case 'Libera': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200'; 
    case 'Dia': return 'bg-violet-500/10 border-violet-500/30 text-violet-200';
    case 'Neben': return 'bg-red-500/10 border-red-500/30 text-red-200';
    case 'Mitte': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200';
    default: return 'bg-slate-800 border-slate-700 text-slate-200';
  }
};

const getRoleDot = (role: string) => {
  switch (role) {
    case 'Pass': return 'bg-blue-400';
    case 'Libera': return 'bg-yellow-400';
    case 'Dia': return 'bg-violet-400';
    case 'Neben': return 'bg-red-400';
    case 'Mitte': return 'bg-emerald-400';
    default: return 'bg-slate-500';
  }
};

interface Player {
  name: string;
  number: number;
  role: string;
  mental: number;
  physical: number;
}

interface Substitution {
  playerOut: string;
  playerIn: string;
  score: string;
}

interface SetData {
  setNumber: number;
  startingLineup: (string | null)[];
  libero: string | null;
  substitutions: Substitution[];
  finalScore: string;
  liberoShares?: Record<string, number>;
}

export default function MatchBoardClient({ initialPlayers }: { initialPlayers: Player[] }) {
  const [court, setCourt] = useState<(string | null)[]>([null, null, null, null, null, null]);
  const [libero, setLibero] = useState<string | null>(null);
  const [activeBox, setActiveBox] = useState<number | 'libero' | null>(null);
  
  // NEW: Opponent Name State
  const [opponentName, setOpponentName] = useState<string>('');

  const [currentSetNumber, setCurrentSetNumber] = useState<number>(1);
  const [matchSets, setMatchSets] = useState<SetData[]>([]);
  const [matchStarted, setMatchStarted] = useState<boolean>(false);

  const [subModal, setSubModal] = useState<{ playerOut: string; playerIn: string; boxIndex: number } | null>(null);
  const [subScoreInput, setSubScoreInput] = useState<string>('');
  
  const [isEndingSet, setIsEndingSet] = useState<boolean>(false);
  const [finalScoreInput, setFinalScoreInput] = useState<string>('');
  const [liberoShares, setLiberoShares] = useState<Record<string, number>>({});
  
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [matchFinished, setMatchFinished] = useState<boolean>(false);

  // 1. RECOVERY
  useEffect(() => {
    const fetchLiveMatch = async () => {
      try {
        const res = await fetch('/api/match');
        const data = await res.json();
        
        if (data.liveMatch) {
          setCourt(data.liveMatch.court || [null, null, null, null, null, null]);
          setLibero(data.liveMatch.libero || null);
          setCurrentSetNumber(data.liveMatch.currentSetNumber || 1);
          setMatchSets(data.liveMatch.sets || []);
          setOpponentName(data.liveMatch.opponentName || '');
          if (data.liveMatch.currentSetNumber > 1 || (data.liveMatch.court && data.liveMatch.court.some(Boolean))) {
            setMatchStarted(true); 
          }
        }
      } catch (e) {
        console.error("Could not fetch live match data", e);
      }
    };
    fetchLiveMatch();
  }, []);

  // 2. AUTOSAVE HELPER
  const autoSaveDraft = async (updatedCourt: any, updatedLibero: any, updatedSets: any, updatedSetNum: number, updatedOpponent?: string) => {
    try {
      await fetch('/api/match', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          court: updatedCourt,
          libero: updatedLibero,
          sets: updatedSets,
          currentSetNumber: updatedSetNum,
          opponentName: updatedOpponent !== undefined ? updatedOpponent : opponentName
        })
      });
    } catch (e) {
      console.error("Failed to auto-save", e);
    }
  };

  const availableLiberos = useMemo(() => initialPlayers.filter(p => p.role === 'Libera'), [initialPlayers]);

  const currentSetSubsCount = useMemo(() => {
    const currentSet = matchSets.find(s => s.setNumber === currentSetNumber);
    return currentSet ? currentSet.substitutions.length : 0;
  }, [matchSets, currentSetNumber]);

  const activeOnCourtNames = useMemo(() => {
    const names = new Set(court.filter(Boolean));
    if (libero) names.add(libero);
    return names;
  }, [court, libero]);

  const { d5Wins, oppWins } = useMemo(() => {
    let d5 = 0;
    let opp = 0;
    matchSets.forEach(s => {
      if (s.finalScore) {
        const match = s.finalScore.match(/^(\d+):(\d+)$/);
        if (match) {
          const s1 = parseInt(match[1], 10);
          const s2 = parseInt(match[2], 10);
          if (s1 > s2) d5++;
          else if (s2 > s1) opp++;
        }
      }
    });
    return { d5Wins: d5, oppWins: opp };
  }, [matchSets]);

  const isMatchOver = d5Wins === 3 || oppWins === 3;

  const burnedPlayers = useMemo(() => {
    const currentSet = matchSets.find(s => s.setNumber === currentSetNumber);
    if (!currentSet) return new Set<string>();

    const burned = new Set<string>();
    const ins = new Set<string>();
    const outs = new Set<string>();

    currentSet.substitutions.forEach(sub => {
      ins.add(sub.playerIn);
      outs.add(sub.playerOut);
    });

    initialPlayers.forEach(p => {
      if (ins.has(p.name) && outs.has(p.name)) {
        burned.add(p.name);
      }
    });

    return burned;
  }, [matchSets, currentSetNumber, initialPlayers]);

  const benchPartners = useMemo(() => {
    const partners: (string | null)[] = [null, null, null, null, null, null];
    const currentSet = matchSets.find(s => s.setNumber === currentSetNumber);
    if (!currentSet) return partners;

    court.forEach((activePlayer, idx) => {
      if (!activePlayer) return;
      let waitingPartner: string | null = null;
      currentSet.substitutions.forEach(sub => {
        if (sub.playerIn === activePlayer) waitingPartner = sub.playerOut;
        if (sub.playerOut === activePlayer) waitingPartner = null;
      });
      if (waitingPartner && !burnedPlayers.has(waitingPartner)) {
        partners[idx] = waitingPartner;
      }
    });
    return partners;
  }, [matchSets, currentSetNumber, court, burnedPlayers]);

  const handleSelectPlayer = (playerName: string) => {
    if (activeBox === null || isMatchOver) return;

    if (activeBox === 'libero') {
      setLibero(playerName);
      setActiveBox(null);
      return;
    }

    if (matchStarted && court[activeBox] !== null) {
      const playerOut = court[activeBox] as string;

      if (burnedPlayers.has(playerOut)) {
        alert(`FIVB Regelverstoß: ${playerOut} darf in diesem Satz nicht mehr ausgewechselt werden!`);
        setActiveBox(null);
        return;
      }

      if (currentSetSubsCount >= 6) {
        alert("Maximale Anzahl von 6 Auswechslungen pro Satz erreicht!");
        setActiveBox(null);
        return;
      }

      const requiredBenchPlayer = benchPartners[activeBox];
      if (requiredBenchPlayer && playerName !== requiredBenchPlayer) {
        alert(`Regelverstoß: ${playerOut} kann nur durch ${requiredBenchPlayer} ersetzt werden!`);
        setActiveBox(null);
        return;
      }

      setSubModal({ playerOut, playerIn: playerName, boxIndex: activeBox });
      setActiveBox(null);
      return;
    }

    const newCourt = [...court];
    const existingIndex = newCourt.indexOf(playerName);
    if (existingIndex !== -1) {
      newCourt[existingIndex] = null;
    }
    newCourt[activeBox] = playerName;
    setCourt(newCourt);
    setActiveBox(null);
  };

  const confirmSubstitution = () => {
    if (!subModal) return;
    const score = subScoreInput.trim().replace(/[\s\-]+/g, ':') || '0:0';
    const { playerOut, playerIn, boxIndex } = subModal;

    let updatedSets = [...matchSets];
    const existingSetIndex = updatedSets.findIndex(s => s.setNumber === currentSetNumber);
    const subEntry = { playerOut, playerIn, score };
    
    if (existingSetIndex >= 0) {
      updatedSets[existingSetIndex] = {
        ...updatedSets[existingSetIndex],
        substitutions: [...updatedSets[existingSetIndex].substitutions, subEntry]
      };
    } else {
      updatedSets.push({
        setNumber: currentSetNumber,
        startingLineup: [...court],
        libero,
        substitutions: [subEntry],
        finalScore: ''
      });
    }

    const newCourt = [...court];
    newCourt[boxIndex] = playerIn;

    setMatchSets(updatedSets);
    setCourt(newCourt);
    setSubModal(null);
    setSubScoreInput('');

    autoSaveDraft(newCourt, libero, updatedSets, currentSetNumber);
  };

  const startMatchOrSet = () => {
    if (!opponentName.trim()) {
      alert("Bitte gib den Namen des gegnerischen Teams ein!");
      return;
    }

    const allFilled = court.every(p => p !== null) && libero !== null;
    if (!allFilled) {
      alert("Bitte besetze alle 6 Felder und wähle eine Libera aus!");
      return;
    }
    setMatchStarted(true);

    let updatedSets = [...matchSets];
    if (!updatedSets.some(s => s.setNumber === currentSetNumber)) {
      updatedSets.push({
        setNumber: currentSetNumber,
        startingLineup: [...court],
        libero,
        substitutions: [],
        finalScore: ''
      });
    }
    setMatchSets(updatedSets);
    autoSaveDraft(court, libero, updatedSets, currentSetNumber);
  };

  const openEndSetModal = () => {
    setIsEndingSet(true);
    const shares: Record<string, number> = {};
    availableLiberos.forEach(l => {
      shares[l.name] = (l.name === libero) ? 100 : 0;
    });
    setLiberoShares(shares);
  };

  const confirmEndSet = () => {
    const score = finalScoreInput.trim().replace(/[\s\-]+/g, ':');
    const match = score.match(/^(\d+):(\d+)$/);
    
    if (!match) {
      alert("Bitte gib ein gültiges Ergebnis ein (z.B. 25 21 oder 25:21).");
      return;
    }

    const s1 = parseInt(match[1], 10);
    const s2 = parseInt(match[2], 10);
    const target = currentSetNumber === 5 ? 15 : 25;

    if (Math.max(s1, s2) < target || Math.abs(s1 - s2) < 2) {
      alert(`Ungültiges Ergebnis! Ein Team muss mind. ${target} Punkte haben (bzw. 15 im 5. Satz) und der Abstand muss 2 betragen.`);
      return;
    }
    
    if (availableLiberos.length > 1) {
      const totalPercent = Object.values(liberoShares).reduce((acc, val) => acc + (val || 0), 0);
      if (totalPercent !== 100) {
        alert("Die Spielanteile der Liberas müssen zusammen genau 100% ergeben!");
        return;
      }
    }

    let updatedSets = [...matchSets];
    const idx = updatedSets.findIndex(s => s.setNumber === currentSetNumber);
    if (idx >= 0) {
      updatedSets[idx] = {
        ...updatedSets[idx],
        finalScore: score,
        liberoShares: { ...liberoShares }
      };
    }

    setMatchSets(updatedSets);
    setIsEndingSet(false);
    setFinalScoreInput('');
    setCurrentSetNumber(prev => prev + 1);
    setMatchStarted(false);

    autoSaveDraft(court, libero, updatedSets, currentSetNumber + 1);
  };

  const finishMatch = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sets: matchSets, opponentName })
      });
      const data = await res.json();
      if (data.success) {
        setMatchFinished(true);
      } else {
        alert("Fehler beim Speichern.");
      }
    } catch (e) {
      alert("Verbindungsfehler.");
    } finally {
      setIsSaving(false);
    }
  };

  const rotateForward = () => {
    setCourt(prev => {
      const next = [...prev];
      next[4] = prev[5]; next[3] = prev[4]; next[0] = prev[3];
      next[1] = prev[0]; next[2] = prev[1]; next[5] = prev[2];
      return next;
    });
  };

  const rotateBackward = () => {
    setCourt(prev => {
      const next = [...prev];
      next[5] = prev[4]; next[4] = prev[3]; next[3] = prev[0];
      next[0] = prev[1]; next[1] = prev[2]; next[2] = prev[5];
      return next;
    });
  };

  const warnings = useMemo(() => {
    const w: string[] = [];
    const positionOrderIndices = [5, 2, 1, 0, 3, 4];
    for (let i = 0; i < 6; i++) {
      const currentIdx = positionOrderIndices[i];
      const nextIdx = positionOrderIndices[(i + 1) % 6];
      const currentPlayer = court[currentIdx];
      const nextPlayer = court[nextIdx];
      if (currentPlayer && nextPlayer) {
        const currentRole = initialPlayers.find(p => p.name === currentPlayer)?.role;
        const nextRole = initialPlayers.find(p => p.name === nextPlayer)?.role;
        if (currentRole === 'Pass' && nextRole !== 'Neben') w.push("Nach 'Pass' sollte eine 'Neben' folgen.");
        if (currentRole === 'Dia' && nextRole !== 'Neben') w.push("Nach 'Dia' sollte eine 'Neben' folgen.");
        if (currentRole === 'Neben' && nextRole !== 'Mitte') w.push("Nach 'Neben' sollte eine 'Mitte (Haupt)' folgen.");
        if (currentRole === 'Mitte' && nextRole !== 'Dia' && nextRole !== 'Pass') w.push("Nach 'Mitte (Haupt)' sollte 'Dia' oder 'Pass' folgen.");
      }
    }
    return Array.from(new Set(w));
  }, [court, initialPlayers]);

  const groupedPlayers = initialPlayers.reduce((acc: any, player) => {
    if (!acc[player.role]) acc[player.role] = [];
    acc[player.role].push(player);
    return acc;
  }, {});

  if (matchFinished) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-black mb-4">🏆 Match beendet!</h1>
        <p className="text-slate-400 mb-8">Alle Sätze wurden erfolgreich ausgewertet und gespeichert.</p>
        <a href="/admin/attendance" className="bg-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-500 transition-colors">
          Zurück zur Attendance Übersicht
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8 font-sans flex flex-col md:flex-row gap-8 relative">
      <div className="flex-1 flex flex-col items-center">
        <div className="flex justify-between items-center w-full max-w-2xl mb-6">
          <div>
            <h1 className="text-2xl font-black text-white tracking-wider">
              {isMatchOver ? `🏆 Match Ende (${d5Wins} : ${oppWins})` : `🏐 Satz ${currentSetNumber} ${matchStarted ? '(Live)' : '(Aufstellung)'}`}
            </h1>
            
            {/* NEW: Opponent Input / Display */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gegner:</span>
              {!matchStarted && currentSetNumber === 1 ? (
                <input
                  type="text"
                  placeholder="Teamname..."
                  value={opponentName}
                  onChange={e => {
                    setOpponentName(e.target.value);
                    autoSaveDraft(court, libero, matchSets, currentSetNumber, e.target.value);
                  }}
                  className="bg-slate-800 border border-slate-600 text-white px-2 py-1 rounded text-xs outline-none focus:border-indigo-500 w-40"
                />
              ) : (
                <span className="text-sm font-bold text-amber-400 uppercase tracking-widest">{opponentName || 'Unbekannt'}</span>
              )}
            </div>

            {!isMatchOver && matchStarted && (
              <p className="text-xs font-bold text-amber-400 mt-2 uppercase tracking-widest">
                Auswechslungen: {currentSetSubsCount} / 6
              </p>
            )}
          </div>
          
          <div className="flex gap-3">
            {isMatchOver ? (
              <button onClick={finishMatch} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all animate-pulse flex items-center gap-2">
                {isSaving ? 'Speichere...' : '🏆 Match Abschließen'}
              </button>
            ) : (
              <>
                {!matchStarted ? (
                  <button onClick={startMatchOrSet} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg transition-all">
                    ▶ Start Satz {currentSetNumber}
                  </button>
                ) : (
                  <button onClick={openEndSetModal} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg transition-all">
                    🏁 Satz Beenden
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="relative w-full max-w-2xl">
          <div className="w-full h-4 bg-slate-200 rounded-t-lg border-b-4 border-slate-400 mb-2 shadow-lg flex items-center justify-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Netz</span>
          </div>

          <div className="w-full aspect-[4/3] bg-slate-800/80 border-2 border-slate-600 rounded-b-xl grid grid-cols-3 grid-rows-2 p-3 gap-3 shadow-2xl relative place-items-center">
            <div className="absolute top-1/3 left-0 right-0 border-t-2 border-slate-500/50 w-full pointer-events-none"></div>

            {[
              { label: 'Pos 4', idx: 0 }, { label: 'Pos 3', idx: 1 }, { label: 'Pos 2', idx: 2 },
              { label: 'Pos 5', idx: 3 }, { label: 'Pos 6', idx: 4 }, { label: 'Pos 1', idx: 5 }
            ].map(box => {
              const playerName = court[box.idx];
              const playerObj = initialPlayers.find(p => p.name === playerName);
              const benchPartnerName = benchPartners[box.idx];
              const benchPlayerObj = initialPlayers.find(p => p.name === benchPartnerName);

              let boxStyle = '';
              if (activeBox === box.idx) {
                boxStyle = playerObj 
                  ? `${getRoleColors(playerObj.role)} scale-110 ring-2 ring-white shadow-xl z-20` 
                  : 'bg-indigo-500/20 border-indigo-400/50 scale-110 ring-2 ring-white shadow-[0_0_20px_rgba(99,102,241,0.3)] z-20 text-indigo-200';
              } else if (playerObj) {
                boxStyle = `${getRoleColors(playerObj.role)} hover:scale-105 shadow-md z-10 backdrop-blur-sm`;
              } else {
                boxStyle = 'bg-slate-900/50 border-dashed border-slate-700 hover:bg-slate-700/50 text-slate-600';
              }

              return (
                <button
                  key={box.idx}
                  onClick={() => setActiveBox(box.idx)}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 transition-all w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 overflow-hidden ${boxStyle}`}
                >
                  <span className="absolute top-1 left-2 text-[9px] font-bold uppercase tracking-widest opacity-50">{box.label}</span>
                  
                  {playerObj ? (
                    <>
                      {burnedPlayers.has(playerObj.name) && matchStarted && (
                        <span className="absolute top-1 right-2 text-sm opacity-75" title="Gesperrt (FIVB)">🔒</span>
                      )}

                      <div className="flex flex-col items-center justify-center w-full mt-2">
                        <span className="text-2xl sm:text-3xl font-black leading-none opacity-90">#{playerObj.number}</span>
                        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider opacity-90 truncate max-w-[100px]">{playerObj.name}</span>
                      </div>
                      {benchPlayerObj && (
                        <div className="absolute bottom-0 left-0 w-full bg-slate-950/80 border-t border-white/10 py-1 px-2 flex items-center justify-center gap-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Bank:</span>
                          <span className="text-[10px] font-bold text-slate-300 truncate">#{benchPlayerObj.number} {benchPlayerObj.name}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="font-bold text-3xl">+</span>
                  )}
                </button>
              );
            })}
          </div>

          {warnings.length > 0 && (
            <div className="mt-4 w-full bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col gap-1 shadow-lg backdrop-blur-sm">
              <h3 className="text-amber-400 font-bold text-xs uppercase tracking-widest mb-1">⚠️ Aufstellungs-Warnung</h3>
              {warnings.map((warn, i) => <p key={i} className="text-amber-200/80 text-sm font-medium">{warn}</p>)}
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-6">
            <button onClick={rotateBackward} disabled={isMatchOver} className="px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-sm font-bold flex items-center gap-2 disabled:opacity-30">
              <span className="text-lg">⟲</span> Rotation zurück
            </button>
            
            <button
              onClick={() => setActiveBox('libero')}
              disabled={isMatchOver}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 transition-all shadow-lg w-32 h-20 backdrop-blur-sm overflow-hidden disabled:opacity-30
                ${activeBox === 'libero' 
                  ? libero ? `${getRoleColors('Libera')} scale-110 ring-2 ring-white shadow-xl` : 'bg-yellow-500/20 border-yellow-400/50 scale-110 ring-2 ring-white text-yellow-200'
                  : libero ? `${getRoleColors('Libera')} hover:scale-105` 
                  : 'bg-slate-900/50 border-dashed border-slate-700 text-slate-600'}`}
            >
              <span className="absolute top-1 left-2 text-[9px] font-bold uppercase tracking-widest opacity-50">Libera</span>
              {libero ? (
                <>
                  <span className="text-2xl font-black opacity-90">#{initialPlayers.find(p => p.name === libero)?.number}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{libero}</span>
                </>
              ) : <span className="font-bold text-2xl">+</span>}
            </button>

            <button onClick={rotateForward} disabled={isMatchOver} className="px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-sm font-bold flex items-center gap-2 disabled:opacity-30">
              Rotation vor <span className="text-lg">⟳</span>
            </button>
          </div>
        </div>
      </div>

      <div className={`w-full md:w-96 bg-slate-800/90 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-slate-700 transition-opacity duration-300 ${activeBox !== null ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
        <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">
          {activeBox === 'libero' ? 'Wähle eine Libera' : matchStarted ? 'Wechsle Spielerin ein' : 'Wähle Startspielerin'}
        </h2>

        <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
          {Object.entries(groupedPlayers).map(([role, players]: any) => {
            if (activeBox === 'libero' && role !== 'Libera') return null;
            if (activeBox !== 'libero' && role === 'Libera') return null;

            const requiredBenchPlayer = (activeBox !== null && activeBox !== 'libero') ? benchPartners[activeBox] : null;

            const availablePlayers = players.filter((p: any) => {
              if (activeOnCourtNames.has(p.name)) return false; 
              if (burnedPlayers.has(p.name)) return false; 
              if (requiredBenchPlayer) return p.name === requiredBenchPlayer; 
              if (benchPartners.includes(p.name)) return false; 
              return true;
            });

            if (availablePlayers.length === 0) return null;

            return (
              <div key={role}>
                <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${getRoleDot(role)} shadow-sm`}></span>
                  <span className="text-slate-400">{role === 'Mitte' ? 'Mitte (Haupt)' : role}</span>
                </h3>
                <div className="flex flex-col gap-2">
                  {availablePlayers.map((player: any) => (
                    <button
                      key={player.name}
                      onClick={() => handleSelectPlayer(player.name)}
                      className="p-3 rounded-xl flex items-center justify-between border transition-all text-left bg-slate-700/50 border-slate-600 hover:bg-slate-600 hover:border-indigo-400/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black w-6 text-center text-slate-300">{player.number}</span>
                        <span className="font-bold text-slate-200">{player.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-xs font-bold text-slate-300 bg-slate-800/80 px-2 py-1 rounded shadow-inner">🧠 {player.mental}</span>
                        <span className="text-xs font-bold text-slate-300 bg-slate-800/80 px-2 py-1 rounded shadow-inner">🔋 {player.physical}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {subModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl w-96 shadow-2xl text-white">
            <h3 className="text-xl font-bold mb-2">Auswechslung ({currentSetSubsCount + 1}/6)</h3>
            <p className="text-sm text-slate-400 mb-6">
              <strong className="text-red-400">{subModal.playerOut}</strong> raus, <strong className="text-emerald-400">{subModal.playerIn}</strong> rein.
            </p>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Punktestand (D5 : Gegner, z.B. 14:12)</label>
            <input 
              type="text" 
              placeholder="14:12" 
              value={subScoreInput} 
              onChange={e => setSubScoreInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 p-3 rounded-xl text-white text-lg font-bold mb-6 outline-none focus:border-indigo-500"
            />
            <div className="flex gap-4">
              <button onClick={() => setSubModal(null)} className="w-1/2 bg-slate-700 py-3 rounded-xl font-bold hover:bg-slate-600">Abbrechen</button>
              <button onClick={confirmSubstitution} className="w-1/2 bg-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-500">Bestätigen</button>
            </div>
          </div>
        </div>
      )}

      {isEndingSet && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl w-96 shadow-2xl text-white">
            <h3 className="text-xl font-bold mb-2">Satz {currentSetNumber} beenden</h3>
            
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2 mt-4">Endstand (D5 : Gegner)</label>
            <input 
              type="text" 
              placeholder="25:21" 
              value={finalScoreInput} 
              onChange={e => setFinalScoreInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 p-3 rounded-xl text-white text-lg font-bold outline-none focus:border-indigo-500"
            />

            {availableLiberos.length > 1 && (
              <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                <label className="block text-xs font-bold uppercase text-slate-400 mb-3">Libera Einsatz (%)</label>
                {availableLiberos.map(lib => (
                  <div key={lib.name} className="flex flex-col mb-4 last:mb-0">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-slate-300">{lib.name}</span>
                      <span className="text-lg font-black text-amber-400">{liberoShares[lib.name] ?? 0}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" step="10"
                      value={liberoShares[lib.name] ?? 0} 
                      onChange={e => setLiberoShares({...liberoShares, [lib.name]: parseInt(e.target.value) || 0})} 
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500" 
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsEndingSet(false)} className="w-1/2 bg-slate-700 py-3 rounded-xl font-bold hover:bg-slate-600">Abbrechen</button>
              <button onClick={confirmEndSet} className="w-1/2 bg-emerald-600 py-3 rounded-xl font-bold hover:bg-emerald-500">Speichern</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}