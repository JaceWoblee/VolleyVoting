"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface CheckInRecord {
  playerName: string;
  mentalHealth: number;
  physicalHealth: number;
  createdAt: string; 
}

type FilterOption = 'training' | 'weeks' | 'months' | 'season';

export default function CheckInResults() {
  const router = useRouter();
  const [allData, setAllData] = useState<CheckInRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterOption>('training');
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  
  // NEW: Track which specific player card is expanded to see their individual votes
  const [expandedPlayerKey, setExpandedPlayerKey] = useState<string | null>(null);

  // 1. Fetch data and filter out legacy records (before Sept 16, 2026)
  useEffect(() => {
    fetch('/api/checkin')
      .then(res => res.json())
      .then((data: CheckInRecord[]) => {
        const cutoffDate = new Date('2026-09-16T00:00:00Z');
        const realCheckIns = data.filter(record => new Date(record.createdAt) >= cutoffDate);
        setAllData(realCheckIns);
      });
  }, []);

  // 2. Compute Flat View (Last 24h & Entire Season)
  const flatViewData = useMemo(() => {
    if (activeFilter === 'weeks' || activeFilter === 'months') return null;

    const now = new Date();
    const filtered = allData.filter(record => {
      if (activeFilter === 'training') {
        const diffHours = (now.getTime() - new Date(record.createdAt).getTime()) / (1000 * 60 * 60);
        return diffHours <= 24;
      }
      return true;
    });

    if (filtered.length === 0) return { teamMental: "0.0", teamPhysical: "0.0", playerStats: [] };

    const totalM = filtered.reduce((sum, r) => sum + r.mentalHealth, 0);
    const totalP = filtered.reduce((sum, r) => sum + r.physicalHealth, 0);

    const pStats: Record<string, {m: number, p: number, c: number, records: CheckInRecord[]}> = {};
    filtered.forEach(r => {
      if(!pStats[r.playerName]) pStats[r.playerName] = {m:0, p:0, c:0, records: []};
      pStats[r.playerName].m += r.mentalHealth;
      pStats[r.playerName].p += r.physicalHealth;
      pStats[r.playerName].c += 1;
      pStats[r.playerName].records.push(r);
    });

    const playerStats = Object.keys(pStats).map(name => ({
      name,
      mental: (pStats[name].m / pStats[name].c).toFixed(1),
      physical: (pStats[name].p / pStats[name].c).toFixed(1),
      count: pStats[name].c,
      // Sort newest individual records to the top
      records: pStats[name].records.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    })).sort((a,b) => a.name.localeCompare(b.name));

    return {
      teamMental: (totalM / filtered.length).toFixed(1),
      teamPhysical: (totalP / filtered.length).toFixed(1),
      playerStats
    };
  }, [allData, activeFilter]);

  // 3. Compute Grouped View (Weeks & Months)
  const groupedViewData = useMemo(() => {
    if (activeFilter !== 'weeks' && activeFilter !== 'months') return [];

    const groups: Record<string, any> = {};

    allData.forEach(record => {
      const d = new Date(record.createdAt);
      let key = '';
      let label = '';
      let sortValue = 0;

      if (activeFilter === 'weeks') {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        monday.setHours(0,0,0,0);
        
        key = monday.toISOString();
        label = `Woche vom ${monday.toLocaleDateString('de-CH', { day: '2-digit', month: 'short', year: 'numeric'})}`;
        sortValue = monday.getTime();
      } else {
        const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
        key = firstOfMonth.toISOString();
        label = d.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' });
        sortValue = firstOfMonth.getTime();
      }

      if (!groups[key]) {
        groups[key] = { key, label, sortValue, records: [], playerStats: [] };
      }
      groups[key].records.push(record);
    });

    const sortedGroups = Object.values(groups).sort((a: any, b: any) => b.sortValue - a.sortValue);

    sortedGroups.forEach((group: any) => {
      const totalM = group.records.reduce((sum: number, r: any) => sum + r.mentalHealth, 0);
      const totalP = group.records.reduce((sum: number, r: any) => sum + r.physicalHealth, 0);
      group.teamAvgMental = (totalM / group.records.length).toFixed(1);
      group.teamAvgPhysical = (totalP / group.records.length).toFixed(1);

      const pStats: Record<string, {m: number, p: number, c: number, records: CheckInRecord[]}> = {};
      group.records.forEach((r: any) => {
        if(!pStats[r.playerName]) pStats[r.playerName] = {m:0, p:0, c:0, records: []};
        pStats[r.playerName].m += r.mentalHealth;
        pStats[r.playerName].p += r.physicalHealth;
        pStats[r.playerName].c += 1;
        pStats[r.playerName].records.push(r);
      });

      group.playerStats = Object.keys(pStats).map(name => ({
        name,
        mental: (pStats[name].m / pStats[name].c).toFixed(1),
        physical: (pStats[name].p / pStats[name].c).toFixed(1),
        count: pStats[name].c,
        records: pStats[name].records.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      })).sort((a,b) => a.name.localeCompare(b.name));
    });

    return sortedGroups;
  }, [allData, activeFilter]);

  // Auto-expand the most recent card when switching to grouped views
  useEffect(() => {
    if ((activeFilter === 'weeks' || activeFilter === 'months') && groupedViewData.length > 0) {
      setExpandedGroupKey(groupedViewData[0].key);
    }
  }, [activeFilter, groupedViewData]);


  // Helper component to render individual player cards with click-to-expand functionality
  const renderPlayerCard = (stat: any, groupKey: string) => {
    const playerKey = `${groupKey}-${stat.name}`;
    const isPlayerExpanded = expandedPlayerKey === playerKey;

    // Optional: Highlight averages if they drop too low
    const isAvgMentalLow = Number(stat.mental) <= 4.5;
    const isAvgPhysicalLow = Number(stat.physical) <= 4.5;

    return (
      <div key={stat.name} className="bg-slate-700/50 rounded-xl border border-slate-600 transition-all flex flex-col">
        <div 
          onClick={() => setExpandedPlayerKey(isPlayerExpanded ? null : playerKey)}
          className="p-4 cursor-pointer select-none"
        >
          <div className="flex justify-between items-center border-b border-slate-600 pb-2 mb-3">
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-white truncate">{stat.name}</span>
              <span className={`text-slate-500 text-[10px] transition-transform duration-200 ${isPlayerExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </div>
            <span className="text-[10px] font-black bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full shrink-0">
              {stat.count}x
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">Ø Mental</span>
              <span className={`text-sm font-black ${isAvgMentalLow ? 'text-red-400' : 'text-blue-400'}`}>
                {stat.mental}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">Ø Physisch</span>
              <span className={`text-sm font-black ${isAvgPhysicalLow ? 'text-violet-400' : 'text-emerald-400'}`}>
                {stat.physical}
              </span>
            </div>
          </div>
        </div>

        {/* Expanded Individual Records */}
        {isPlayerExpanded && (
          <div className="px-4 pb-4 pt-1 space-y-2 border-t border-slate-600/50 mt-1">
            {stat.records.map((r: CheckInRecord, idx: number) => {
              const d = new Date(r.createdAt);
              const dateStr = d.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit' });
              
              // Define thresholds for individual low votes
              const isMentalLow = r.mentalHealth <= 4;
              const isPhysicalLow = r.physicalHealth <= 4;

              return (
                <div key={idx} className="flex justify-between items-center text-xs bg-slate-800 p-2 rounded border border-slate-700 shadow-sm">
                  <span className="text-slate-400">{dateStr}</span>
                  <div className="flex gap-3">
                    <span className={`font-bold w-10 ${isMentalLow ? 'text-red-400' : 'text-blue-400'}`}>
                      M: {r.mentalHealth}
                    </span>
                    <span className={`font-bold w-10 ${isPhysicalLow ? 'text-violet-400' : 'text-emerald-400'}`}>
                      P: {r.physicalHealth}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6 md:p-10 font-sans text-slate-100">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-wider flex items-center gap-3">
              <span>📊</span> Coach Results
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {allData.length} digitale Check-ins erfasst.
            </p>
          </div>
          <button 
            onClick={() => router.push('/checkin')} 
            className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold shadow-sm transition-colors text-sm"
          >
            ← Zurück zum Kiosk
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-800 p-1.5 rounded-xl w-full mx-auto border border-slate-700 shadow-sm">
          {(['training', 'weeks', 'months', 'season'] as FilterOption[]).map(filter => (
            <button
              key={filter}
              onClick={() => {
                setActiveFilter(filter);
                setExpandedPlayerKey(null); // Reset expanded player on tab switch
              }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                activeFilter === filter 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {filter === 'training' && 'Letzte 24h'}
              {filter === 'weeks' && 'Wochen'}
              {filter === 'months' && 'Monate'}
              {filter === 'season' && 'Saison'}
            </button>
          ))}
        </div>

        {/* Dynamic View Rendering */}
        {activeFilter === 'weeks' || activeFilter === 'months' ? (
          <div className="space-y-4">
            {groupedViewData.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-12 text-center text-slate-400">
                Keine Check-ins in diesem Zeitraum gefunden.
              </div>
            ) : (
              groupedViewData.map((group: any) => {
                const isOpen = expandedGroupKey === group.key;
                return (
                  <div key={group.key} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden transition-all shadow-sm">
                    {/* Accordion Header */}
                    <div 
                      onClick={() => setExpandedGroupKey(isOpen ? null : group.key)}
                      className="p-5 hover:bg-slate-700/50 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors select-none"
                    >
                      <div>
                        <h3 className="font-bold text-white text-lg">{group.label}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {group.records.length} Check-ins erfasst
                        </p>
                      </div>
                      <div className="flex gap-5 items-center w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🧠</span>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase leading-none">Team Mental</span>
                            <span className="font-black text-blue-400 text-lg leading-none">{group.teamAvgMental}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🔋</span>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase leading-none">Team Physisch</span>
                            <span className="font-black text-emerald-400 text-lg leading-none">{group.teamAvgPhysical}</span>
                          </div>
                        </div>
                        <span className="text-slate-500 ml-2 transition-transform">
                          {isOpen ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Accordion Content */}
                    {isOpen && (
                      <div className="p-5 border-t border-slate-700 bg-slate-800/50">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {group.playerStats.map((stat: any) => renderPlayerCard(stat, group.key))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Flat View (24h or Season) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-700 flex flex-col items-center justify-center">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Team Ø Mental</span>
                <span className="text-5xl font-black text-blue-500">{flatViewData?.teamMental || "0.0"}</span>
              </div>
              <div className="bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-700 flex flex-col items-center justify-center">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Team Ø Physisch</span>
                <span className="text-5xl font-black text-emerald-500">{flatViewData?.teamPhysical || "0.0"}</span>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-6 md:p-8 shadow-sm border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-6">Individuelle Werte</h2>
              {flatViewData?.playerStats.length === 0 ? (
                <p className="text-slate-400 italic">Keine Check-ins gefunden.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {flatViewData?.playerStats.map((stat: any) => renderPlayerCard(stat, 'flatView'))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}