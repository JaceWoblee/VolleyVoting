"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface CheckInRecord {
  playerName: string;
  mentalHealth: number;
  physicalHealth: number;
  createdAt: string; 
}

type FilterOption = 'training' | 'week' | 'month' | 'season';

export default function CheckInResults() {
  const router = useRouter();
  const [allData, setAllData] = useState<CheckInRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterOption>('training');
  // NEW: State to track which player's card is currently expanded
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  // 1. Fetch all raw data once on load
  useEffect(() => {
    fetch('/api/checkin')
      .then(res => res.json())
      .then((data: CheckInRecord[]) => {
        setAllData(data);
      });
  }, []);

  // 2. Filter and calculate averages whenever the activeFilter or allData changes
  const { results, averages, rawFilteredData } = useMemo(() => {
    if (allData.length === 0) return { results: [], averages: { mental: "0.0", physical: "0.0" }, rawFilteredData: [] };

    const now = new Date();
    const seasonStart = new Date('2026-09-01');

    // Calculate start of current Calendar Week (Monday)
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1; 
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate start of current Calendar Month (1st day)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Filter by timeframe
    const filteredData = allData.filter(record => {
      if (!record.createdAt) return true; 
      
      const recordDate = new Date(record.createdAt);
      const diffHours = (now.getTime() - recordDate.getTime()) / (1000 * 60 * 60);

      switch (activeFilter) {
        case 'training': 
          return diffHours <= 24;
        case 'week': 
          return recordDate >= startOfWeek; 
        case 'month': 
          return recordDate >= startOfMonth; 
        case 'season': 
          return recordDate >= seasonStart;
        default: 
          return true;
      }
    });

    if (filteredData.length === 0) return { results: [], averages: { mental: "0.0", physical: "0.0" }, rawFilteredData: [] };

    // Calculate Team Averages
    const totalMental = filteredData.reduce((sum, r) => sum + r.mentalHealth, 0);
    const totalPhysical = filteredData.reduce((sum, r) => sum + r.physicalHealth, 0);
    const teamAverages = {
      mental: (totalMental / filteredData.length).toFixed(1),
      physical: (totalPhysical / filteredData.length).toFixed(1)
    };

    // Group by Player to calculate individual averages
    const playerStats: Record<string, { mental: number, physical: number, count: number }> = {};
    
    filteredData.forEach(record => {
      if (!playerStats[record.playerName]) {
        playerStats[record.playerName] = { mental: 0, physical: 0, count: 0 };
      }
      playerStats[record.playerName].mental += record.mentalHealth;
      playerStats[record.playerName].physical += record.physicalHealth;
      playerStats[record.playerName].count += 1;
    });

    // Convert grouped object back to an array and sort
    const aggregatedResults = Object.keys(playerStats).map(name => {
      const stats = playerStats[name];
      return {
        playerName: name,
        mentalHealth: parseFloat((stats.mental / stats.count).toFixed(1)),
        physicalHealth: parseFloat((stats.physical / stats.count).toFixed(1))
      };
    }).sort((a, b) => (a.mentalHealth + a.physicalHealth) - (b.mentalHealth + b.physicalHealth));

    // NEW: We also return `rawFilteredData` so the expanded card can show the history
    return { results: aggregatedResults, averages: teamAverages, rawFilteredData: filteredData };
  }, [allData, activeFilter]);

  // Helper function to color-code individual scores
  const getScoreBadge = (score: number) => {
    if (score <= 4) return "bg-red-500/20 text-red-400 border-red-500/50";
    if (score <= 7) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8 font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
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

      {/* Timeframe Filters */}
      <div className="flex gap-2 mb-10 bg-slate-800 p-2 rounded-xl w-fit">
        {[
          { id: 'training', label: 'This Training (24h)' },
          { id: 'week', label: 'This Week' },
          { id: 'month', label: 'This Month' },
          { id: 'season', label: 'Entire Season' }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => {
              setActiveFilter(filter.id as FilterOption);
              setExpandedPlayer(null); // Close any open plate when changing filters
            }}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeFilter === filter.id 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {filter.label}
          </button>
        ))}
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
      {results.length > 0 ? (
        <div className="flex flex-col gap-4">
          {results.map(player => {
            const totalScore = player.mentalHealth + player.physicalHealth;
            const borderIndicator = totalScore <= 10 ? "border-red-500" : "border-slate-700";
            
            // 1. Get all historical records FIRST
            const playerHistory = rawFilteredData
              .filter(r => r.playerName === player.playerName)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            // 2. NEW LOGIC: Only allow expansion if they have more than 1 entry
            const canExpand = activeFilter !== 'training' && playerHistory.length > 1;
            const isExpanded = expandedPlayer === player.playerName;

            return (
              <div key={player.playerName} className="flex flex-col gap-2">
                
                {/* Main Player Plate */}
                <div 
                  onClick={() => canExpand && setExpandedPlayer(isExpanded ? null : player.playerName)}
                  className={`p-5 bg-slate-800 rounded-xl flex justify-between items-center border-l-8 ${borderIndicator} shadow-md transition-colors ${canExpand ? 'cursor-pointer hover:bg-slate-750' : ''}`}
                >
                  <div className="flex flex-col">
                    <strong className="text-2xl text-white tracking-wide">{player.playerName}</strong>
                    {canExpand && (
                      <span className="text-xs text-slate-400 mt-1 font-bold">
                        {isExpanded ? '▼ HIDE HISTORY' : '▶ SHOW HISTORY'}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-4">
                    <div className={`px-4 py-2 rounded-lg border font-bold text-lg flex gap-2 items-center min-w-[80px] justify-center ${getScoreBadge(player.mentalHealth)}`}>
                      <span>🧠</span> {player.mentalHealth}
                    </div>
                    <div className={`px-4 py-2 rounded-lg border font-bold text-lg flex gap-2 items-center min-w-[80px] justify-center ${getScoreBadge(player.physicalHealth)}`}>
                      <span>🔋</span> {player.physicalHealth}
                    </div>
                  </div>
                </div>

                {/* Expanded History Sub-list */}
                {isExpanded && canExpand && (
                  <div className="ml-8 mr-2 p-4 bg-slate-800/60 rounded-xl border border-slate-700 flex flex-col gap-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-2">
                      Check-in History ({playerHistory.length} entries)
                    </h3>
                    
                    {playerHistory.map((record, idx) => {
                      const dateObj = new Date(record.createdAt);
                      const formattedDate = `${dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })} at ${dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
                      
                      return (
                        <div key={idx} className="flex justify-between items-center bg-slate-700/40 p-3 rounded-lg hover:bg-slate-700 transition-colors">
                          <span className="text-slate-300 font-medium text-sm">{formattedDate}</span>
                          
                          <div className="flex gap-3">
                            <div className={`px-3 py-1 rounded border text-sm font-bold flex gap-1 items-center ${getScoreBadge(record.mentalHealth)}`}>
                              <span>🧠</span> {record.mentalHealth}
                            </div>
                            <div className={`px-3 py-1 rounded border text-sm font-bold flex gap-1 items-center ${getScoreBadge(record.physicalHealth)}`}>
                              <span>🔋</span> {record.physicalHealth}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-12 bg-slate-800 rounded-xl border border-slate-700 text-slate-400">
          No check-in data found for the selected timeframe.
        </div>
      )}
      
    </div>
  );
}