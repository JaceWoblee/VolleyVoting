"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CheckInRecord {
  playerName: string;
  mentalHealth: number;
  physicalHealth: number;
}

export default function CheckInResults() {
  const router = useRouter();
  const [results, setResults] = useState<CheckInRecord[]>([]);
  const [averages, setAverages] = useState({ mental: "0.0", physical: "0.0" });

  useEffect(() => {
    fetch('/api/checkin')
      .then(res => res.json())
      .then((data: CheckInRecord[]) => {
        if (data.length === 0) return;

        const totalMental = data.reduce((sum, player) => sum + player.mentalHealth, 0);
        const totalPhysical = data.reduce((sum, player) => sum + player.physicalHealth, 0);
        
        setAverages({
          mental: (totalMental / data.length).toFixed(1),
          physical: (totalPhysical / data.length).toFixed(1)
        });

        const sorted = data.sort((a, b) => 
          (a.mentalHealth + a.physicalHealth) - (b.mentalHealth + b.physicalHealth)
        );
        setResults(sorted);
      });
  }, []);

  // Helper function to color-code individual scores
  const getScoreBadge = (score: number) => {
    if (score <= 4) return "bg-red-500/20 text-red-400 border-red-500/50";
    if (score <= 7) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8 font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black text-white tracking-wider flex items-center gap-4">
          <span className="text-5xl">📊</span> 
          <span>Coach Dashboard</span>
        </h1>
        <button 
          onClick={() => router.push('/checkin')} 
          className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-colors active:scale-95"
        >
          ← Back to Kiosk
        </button>
      </div>

      {/* Team Averages Dashboard */}
      <div className="grid grid-cols-2 gap-6 mb-12">
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-8 rounded-2xl border border-blue-700 shadow-lg flex flex-col items-center">
          <span className="text-blue-300 text-lg font-bold uppercase tracking-widest mb-2">Team Mental Avg</span>
          <span className="text-6xl font-black text-white">{averages.mental}</span>
        </div>
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 p-8 rounded-2xl border border-emerald-700 shadow-lg flex flex-col items-center">
          <span className="text-emerald-300 text-lg font-bold uppercase tracking-widest mb-2">Team Physical Avg</span>
          <span className="text-6xl font-black text-white">{averages.physical}</span>
        </div>
      </div>

      {/* Sorted Player Results */}
      <div className="flex flex-col gap-4">
        {results.map(player => {
          const totalScore = player.mentalHealth + player.physicalHealth;
          // Red left border if they are struggling, green if they are good
          const borderIndicator = totalScore <= 10 ? "border-red-500" : "border-slate-700";

          return (
            <div key={player.playerName} className={`p-5 bg-slate-800 rounded-xl flex justify-between items-center border-l-8 ${borderIndicator} shadow-md hover:bg-slate-750 transition-colors`}>
              <strong className="text-2xl text-white tracking-wide">{player.playerName}</strong>
              
              <div className="flex gap-4">
                <div className={`px-4 py-2 rounded-lg border font-bold text-lg flex gap-2 items-center ${getScoreBadge(player.mentalHealth)}`}>
                  <span>🧠</span> {player.mentalHealth}
                </div>
                <div className={`px-4 py-2 rounded-lg border font-bold text-lg flex gap-2 items-center ${getScoreBadge(player.physicalHealth)}`}>
                  <span>🔋</span> {player.physicalHealth}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
    </div>
  );
}