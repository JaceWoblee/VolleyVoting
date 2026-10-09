"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const ALL_PLAYERS = [
  { name: "Ainoa", image: "/ainoa.jpg", color: "#b9b9b9" },
  { name: "Anaïs", image: "/anais.jpg", color: "#6392FF" },
  { name: "Eda", image: "/eda.jpg", color: "#b9b9b9" },
  { name: "Eli", image: "/eli.jpg", color: "#b9b9b9" },
  { name: "Elonie", image: "/elonie.jpg", color: "#FF96D5" },
  { name: "Jeanne", image: "/jeanne.jpg", color: "#A2B3DE" },
  { name: "Laura", image: "/laura.jpg", color: "#F589D2" },
  { name: "Maria", image: "/maria.jpg", color: "#40CACF" },
  { name: "Seraina", image: "/seraina.jpg", color: "#73F8FF" },
  { name: "Sofia", image: "/sofia.jpg", color: "#FF6E99" },
  { name: "Tina", image: "/tina.jpg", color: "#FFE300" },
  { name: "Vera", image: "/vera.jpg", color: "#00BBFF" },
  { name: "Yarina", image: "/yarina.jpg", color: "#6F9950" }
];

export default function CheckInKiosk() {
  const router = useRouter();
  const [players, setPlayers] = useState(ALL_PLAYERS);
  const [selectedPlayer, setSelectedPlayer] = useState<{name: string, image: string, color: string} | null>(null);
  const [mental, setMental] = useState<number>(5);
  const [physical, setPhysical] = useState<number>(5);
  const [kioskMode, setKioskMode] = useState<'training' | 'match'>('training');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load who has already checked in from MongoDB
  const refreshCheckedInPlayers = useCallback(async (currentMode: 'training' | 'match') => {
    try {
      const res = await fetch('/api/checkin');
      const data = await res.json();

      if (Array.isArray(data)) {
        // Look back 4 hours (matches the API rate-limit/cooldown)
        const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

        const checkedInNames = new Set(
          data
            .filter((record: any) => {
              const recordTime = new Date(record.createdAt);
              const recordType = record.type || 'training';
              return recordTime >= fourHoursAgo && recordType === currentMode;
            })
            .map((record: any) => record.playerName)
        );

        setPlayers(ALL_PLAYERS.filter(p => !checkedInNames.has(p.name)));
      }
    } catch (error) {
      console.error("Failed to fetch recent check-ins:", error);
    }
  }, []);

  // Run on mount and whenever mode toggles (Training vs Match)
  useEffect(() => {
    refreshCheckedInPlayers(kioskMode);
  }, [kioskMode, refreshCheckedInPlayers]);

  const handleVote = async () => {
    if (isSubmitting || !selectedPlayer) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerName: selectedPlayer.name, 
          mentalHealth: mental, 
          physicalHealth: physical,
          type: kioskMode
        })
      });

      const json = await res.json();

      if (json.success || res.status === 201) {
        // Remove player from local list immediately
        setPlayers(prev => prev.filter(p => p.name !== selectedPlayer.name));
        setSelectedPlayer(null);
        setMental(5);
        setPhysical(5);
      } else if (res.status === 429) {
        alert(`${selectedPlayer.name} hat sich bereits eingetragen!`);
        setPlayers(prev => prev.filter(p => p.name !== selectedPlayer.name));
        setSelectedPlayer(null);
      } else {
        alert("Fehler beim Check-in. Bitte erneut versuchen.");
      }
    } catch (error) {
      console.error("Check-in failed:", error);
      alert("Verbindungsfehler beim Speichern.");
    } finally {
      setIsSubmitting(false); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8 font-sans">
      <div className="flex justify-between items-center mb-12">
        
        {/* Title & Protected Mode Toggle */}
        <div className="flex items-center gap-6">
          <h1 className="text-4xl font-black text-white tracking-wider flex items-center gap-4">
            <span className="text-5xl drop-shadow-lg">🏐</span> 
            <span>D5 Check-In</span>
          </h1>

          {/* PROTECTED MODE TOGGLE */}
          <button 
            onClick={() => {
              const pin = prompt("Enter Coach PIN to change mode:");
              if (pin === "1337") {
                const nextMode = kioskMode === 'training' ? 'match' : 'training';
                setKioskMode(nextMode);
              } else if (pin !== null) {
                alert("Incorrect PIN.");
              }
            }}
            className={`px-4 py-2 rounded-xl font-extrabold text-xs uppercase tracking-widest transition-all cursor-pointer ${
              kioskMode === 'match' 
                ? 'bg-amber-500 text-amber-950 shadow-[0_0_20px_rgba(245,158,11,0.6)] scale-105' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Mode: {kioskMode === 'match' ? '🔥 MATCH DAY' : '🏐 Training'}
          </button>
        </div>

        {/* Dynamic Nav Button */}
        {kioskMode === 'match' ? (
          <button 
            onClick={() => {
              const pin = prompt("Enter Coach PIN:");
              if (pin === "1337") { 
                router.push('/admin/match');
              } else if (pin !== null) {
                alert("Incorrect PIN.");
              }
            }} 
            className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-black py-4 px-8 text-xl rounded-xl transition-colors shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-95 flex items-center gap-3"
          >
            <span>🏐</span> Open Match Board
          </button>
        ) : (
          <button 
            onClick={() => {
              const pin = prompt("Enter Coach PIN:");
              if (pin === "1337") { 
                router.push('/checkin/results');
              } else if (pin !== null) {
                alert("Incorrect PIN.");
              }
            }} 
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 text-xl rounded-xl transition-colors shadow-[0_0_15px_rgba(37,99,235,0.5)] active:scale-95"
          >
            Coach Results
          </button>
        )}

      </div>

      {/* Grid of Remaining Players */}
      {players.length === 0 ? (
        <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-16 text-center text-slate-400">
          <p className="text-3xl font-extrabold text-white mb-2">Alle Spielerinnen eingecheckt! 🎉</p>
          <p className="text-sm">Für diesen Modus sind aktuell alle Check-ins abgeschlossen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {players.map(player => (
            <button 
              key={player.name} 
              onClick={() => setSelectedPlayer(player)}
              style={{ 
                backgroundImage: `url(${player.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderColor: player.color
              }}
              className="group relative h-32 overflow-hidden text-white font-black text-3xl rounded-2xl shadow-lg transition-all active:scale-95 border-b-8 flex items-center justify-start px-8"
            >
              <div 
                className="absolute inset-0 transition-opacity group-active:opacity-80"
                style={{
                  background: `linear-gradient(to right, ${player.color}cc 30%, ${player.color}00 100%)`
                }}
              />
              <div className="absolute inset-0 bg-black/10" />
              <span className="relative z-10 tracking-wide drop-shadow-lg">{player.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Voting Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all p-4">
          <div className="bg-white p-8 md:p-10 rounded-[2rem] w-full max-w-lg shadow-2xl">
            
            <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-800 mb-8 tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
                {selectedPlayer.name}&apos;s
              </span> Status
            </h2>
            
            <div className="space-y-6 md:space-y-8 mb-10">
              {/* Mental Health */}
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-lg md:text-xl font-bold text-gray-700">🧠 Mentale Energie</label>
                  <span className="text-2xl font-black text-blue-700 bg-blue-200 px-4 py-1 rounded-full shadow-sm">
                    {mental}
                  </span>
                </div>
                <input 
                  type="range" min="1" max="10" 
                  value={mental} 
                  onChange={(e) => setMental(Number(e.target.value))} 
                  className="w-full h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                />
                <div className="flex justify-between text-sm text-gray-500 mt-3 font-semibold">
                  <span>Leer (1)</span>
                  <span>Perfekt (10)</span>
                </div>
              </div>

              {/* Physical Health */}
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-lg md:text-xl font-bold text-gray-700">🔋 Physische Energie</label>
                  <span className="text-2xl font-black text-emerald-700 bg-emerald-200 px-4 py-1 rounded-full shadow-sm">
                    {physical}
                  </span>
                </div>
                <input 
                  type="range" min="1" max="10" 
                  value={physical} 
                  onChange={(e) => setPhysical(Number(e.target.value))} 
                  className="w-full h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-emerald-600" 
                />
                <div className="flex justify-between text-sm text-gray-500 mt-3 font-semibold">
                  <span>Schlimm (1)</span>
                  <span>Perfekt (10)</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setSelectedPlayer(null);
                  setMental(5);
                  setPhysical(5);
                }} 
                className="w-1/3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-4 rounded-2xl shadow transition-transform active:scale-95 text-lg"
              >
                Abbrechen
              </button>
              
              <button 
                onClick={handleVote} 
                disabled={isSubmitting}
                className={`w-2/3 bg-gradient-to-r from-gray-900 to-gray-700 hover:from-black hover:to-gray-800 text-white font-bold px-6 py-4 rounded-2xl shadow-lg transition-transform active:scale-95 text-xl ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Laden...' : 'Senden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}