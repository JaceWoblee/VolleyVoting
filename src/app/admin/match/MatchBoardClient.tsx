'use client';

import { useState, useMemo } from 'react';

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
}

export default function MatchBoardClient({ initialPlayers }: { initialPlayers: Player[] }) {
  const [court, setCourt] = useState<(string | null)[]>([null, null, null, null, null, null]);
  const [libero, setLibero] = useState<string | null>(null);
  
  // NEW: Track the "Bench Partner" for each position box. 
  // If a sub happens, benchPartners[boxIndex] holds the player who is currently sitting on the bench waiting to re-enter.
  const [benchPartners, setBenchPartners] = useState<Record<number, string>>({});

  const [activeBox, setActiveBox] = useState<number | 'libero' | null>(null);

  const [currentSetNumber, setCurrentSetNumber] = useState<number>(1);
  const [matchSets, setMatchSets] = useState<SetData[]>([]);
  const [matchStarted, setMatchStarted] = useState<boolean>(false);

  // Substitution Modal State
  const [subModal, setSubModal] = useState<{ playerOut: string; playerIn: string; boxIndex: number } | null>(null);
  const [subScoreInput, setSubScoreInput] = useState<string>('');

  // Final Set Score Modal State
  const [isEndingSet, setIsEndingSet] = useState<boolean>(false);
  const [finalScoreInput, setFinalScoreInput] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [matchFinished, setMatchFinished] = useState<boolean>(false);

  const currentSetSubsCount = useMemo(() => {
    const currentSet = matchSets.find(s => s.setNumber === currentSetNumber);
    return currentSet ? currentSet.substitutions.length : 0;
  }, [matchSets, currentSetNumber]);

  // List of players currently active anywhere on the court or libero box
  const activeOnCourtNames = useMemo(() => {
    const names = new Set(court.filter(Boolean));
    if (libero) names.add(libero);
    return names;
  }, [court, libero]);

  const handleSelectPlayer = (playerName: string) => {
    if (activeBox === null) return;

    if (activeBox === 'libero') {
      setLibero(playerName);
      setActiveBox(null);
      return;
    }

    // If match has started, clicking an active court box triggers a substitution with a bench player
    if (matchStarted && court[activeBox] !== null) {
      const playerOut = court[activeBox] as string;

      if (currentSetSubsCount >= 6) {
        alert("Maximale Anzahl von 6 Auswechslungen pro Satz erreicht!");
        setActiveBox(null);
        return;
      }

      setSubModal({ playerOut, playerIn: playerName, boxIndex: activeBox });
      setActiveBox(null);
      return;
    }

    // Initial lineup placement before set starts
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
    const score = subScoreInput.trim() || '0:0';
    const { playerOut, playerIn, boxIndex } = subModal;

    // Save substitution into set data
    setMatchSets(prev => {
      const existingSetIndex = prev.findIndex(s => s.setNumber === currentSetNumber);
      const subEntry = { playerOut, playerIn, score };

      if (existingSetIndex >= 0) {
        const updated = [...prev];
        updated[existingSetIndex].substitutions.push(subEntry);
        return updated;
      } else {
        return [...prev, {
          setNumber: currentSetNumber,
          startingLineup: [...court],
          libero,
          substitutions: [subEntry],
          finalScore: ''
        }];
      }
    });

    // Update court to put the new player in, and save the old player into the bench partner slot for this box
    const newCourt = [...court];
    newCourt[boxIndex] = playerIn;
    setCourt(newCourt);

    setBenchPartners(prev => ({
      ...prev,
      [boxIndex]: playerOut
    }));

    setSubModal(null);
    setSubScoreInput('');
  };

  const startMatchOrSet = () => {
    const allFilled = court.every(p => p !== null) && libero !== null;
    if (!allFilled) {
      alert("Bitte besetze alle 6 Felder und wähle eine Libera aus!");
      return;
    }

    setMatchStarted(true);
    setMatchSets(prev => {
      if (prev.some(s => s.setNumber === currentSetNumber)) return prev;
      return [...prev, {
        setNumber: currentSetNumber,
        startingLineup: [...court],
        libero,
        substitutions: [],
        finalScore: ''
      }];
    });
  };

  const confirmEndSet = () => {
    const score = finalScoreInput.trim();
    if (!score) {
      alert("Bitte gib den Endstand des Satzes ein (z.B. 25:21)");
      return;
    }

    setMatchSets(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(s => s.setNumber === currentSetNumber);
      if (idx >= 0) {
        updated[idx].finalScore = score;
      }
      return updated;
    });

    setIsEndingSet(false);
    setFinalScoreInput('');
    setCurrentSetNumber(prev => prev + 1);
    setMatchStarted(false);
    setBenchPartners({}); // Reset bench partners for the new set
  };

  const finishMatch = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sets: matchSets })
      });
      const data = await res.json();
      if (data.success) {
        setMatchFinished(true);
        alert("Match erfolgreich gespeichert!");
      } else {
        alert("Fehler beim Speichern.");
      }
    } catch (e) {
      console.error(e);
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
      
      {/* LEFT SIDE: Court & Controls */}
      <div className="flex-1 flex flex-col items-center">
        <div className="flex justify-between items-center w-full max-w-2xl mb-6">
          <div>
            <h1 className="text-2xl font-black text-white tracking-wider">🏐 Satz {currentSetNumber} {matchStarted ? '(Live)' : '(Aufstellung)'}</h1>
            {matchStarted && (
              <p className="text-xs font-bold text-amber-400 mt-1 uppercase tracking-widest">
                Auswechslungen: {currentSetSubsCount} / 6
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {!matchStarted ? (
              <button onClick={startMatchOrSet} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg transition-all">
                ▶ Start Satz {currentSetNumber}
              </button>
            ) : (
              <button onClick={() => setIsEndingSet(true)} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg transition-all">
                🏁 Satz Beenden
              </button>
            )}
            {currentSetNumber > 3 && (
              <button onClick={finishMatch} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg transition-all">
                {isSaving ? 'Speichere...' : 'Match Abschließen'}
              </button>
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
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 transition-all w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 ${boxStyle}`}
                >
                  <span className="absolute top-1 left-2 text-[9px] font-bold uppercase tracking-widest opacity-50">{box.label}</span>
                  
                  {playerObj ? (
                    <div className="flex flex-col items-center w-full h-full justify-center pt-2">
                      {/* Active Player on Court */}
                      <div className="flex flex-col items-center">
                        <span className="text-2xl sm:text-3xl font-black leading-none opacity-90">#{playerObj.number}</span>
                        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider opacity-90 truncate max-w-[100px]">{playerObj.name}</span>
                      </div>

                      {/* Split Card: Bench Partner waiting underneath */}
                      {benchPlayerObj && (
                        <div className="mt-1 w-full bg-slate-950/60 border-t border-white/10 py-0.5 px-2 flex items-center justify-center gap-1 rounded-b-xl">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Bank:</span>
                          <span className="text-[10px] font-bold text-slate-300 truncate">#{benchPlayerObj.number} {benchPlayerObj.name}</span>
                        </div>
                      )}
                    </div>
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
            <button onClick={rotateBackward} className="px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-sm font-bold flex items-center gap-2">
              <span className="text-lg">⟲</span> Rotation zurück
            </button>
            
            <button
              onClick={() => setActiveBox('libero')}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 transition-all shadow-lg w-32 h-20 backdrop-blur-sm
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

            <button onClick={rotateForward} className="px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-sm font-bold flex items-center gap-2">
              Rotation vor <span className="text-lg">⟳</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Selection Drawer (Hides players already active on court) */}
      <div className={`w-full md:w-96 bg-slate-800/90 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-slate-700 transition-opacity duration-300 ${activeBox !== null ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
        <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">
          {activeBox === 'libero' ? 'Wähle eine Libera' : matchStarted ? 'Wechsle Spielerin ein' : 'Wähle Startspielerin'}
        </h2>

        <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
          {Object.entries(groupedPlayers).map(([role, players]: any) => {
            if (activeBox === 'libero' && role !== 'Libera') return null;
            if (activeBox !== 'libero' && role === 'Libera') return null;

            // Filter out players already active on court
            const availablePlayers = players.filter((p: any) => !activeOnCourtNames.has(p.name));

            if (availablePlayers.length === 0) return null;

            return (
              <div key={role}>
                <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${getRoleDot(role)} shadow-sm`}></span>
                  <span className="text-slate-400">{role}</span>
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

      {/* MODAL 1: Substitution Score Prompt */}
      {subModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl w-96 shadow-2xl text-white">
            <h3 className="text-xl font-bold mb-2">Auswechslung ({currentSetSubsCount + 1}/6)</h3>
            <p className="text-sm text-slate-400 mb-6">
              <strong className="text-red-400">{subModal.playerOut}</strong> raus, <strong className="text-emerald-400">{subModal.playerIn}</strong> rein.
            </p>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Spielstand zum Zeitpunkt (z.B. 14:12)</label>
            <input 
              type="text" 
              placeholder="14:12" 
              value={subScoreInput} 
              onChange={e => setSubScoreInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 p-3 rounded-xl text-white text-lg font-bold mb-6 outline-none focus:border-indigo-500"
            />
            <div className="flex gap-4">
              <button onClick={() => setSubModal(null)} className="w-1/2 bg-slate-700 py-3 rounded-xl font-bold">Abbrechen</button>
              <button onClick={confirmSubstitution} className="w-1/2 bg-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-500">Bestätigen</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: End Set Score Prompt */}
      {isEndingSet && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl w-96 shadow-2xl text-white">
            <h3 className="text-xl font-bold mb-2">Satz {currentSetNumber} beenden</h3>
            <p className="text-sm text-slate-400 mb-6">Gib den finalen Punktestand ein (z.B. 25:21).</p>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Endstand</label>
            <input 
              type="text" 
              placeholder="25:21" 
              value={finalScoreInput} 
              onChange={e => setFinalScoreInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 p-3 rounded-xl text-white text-lg font-bold mb-6 outline-none focus:border-indigo-500"
            />
            <div className="flex gap-4">
              <button onClick={() => setIsEndingSet(false)} className="w-1/2 bg-slate-700 py-3 rounded-xl font-bold">Abbrechen</button>
              <button onClick={confirmEndSet} className="w-1/2 bg-emerald-600 py-3 rounded-xl font-bold hover:bg-emerald-500">Satz speichern</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}