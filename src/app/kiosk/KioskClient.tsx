'use client'

import { useState } from 'react';
import { submitTrainingFocus } from '../actions';

export default function KioskClient({ roster, activeFocuses }: any) {
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [focusPoint, setFocusPoint] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !focusPoint.trim()) return;

    setIsSubmitting(true);
    await submitTrainingFocus(selectedPlayer.shirtNumber, selectedPlayer.name, focusPoint);
    
    // Refresh the page so the next player sees the updated ✅
    window.location.reload(); 
  };

  return (
    <>
      {/* PLAYER PLATES GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {roster.map((player: any) => {
          const hasCheckedIn = activeFocuses.some((f: any) => f.shirtNumber === player.shirtNumber);
          const isSelected = selectedPlayer?.shirtNumber === player.shirtNumber;

          return (
            <button
              key={player.shirtNumber}
              onClick={() => setSelectedPlayer(player)}
              className={`p-6 rounded-2xl text-lg font-bold transition-all border-2 
                ${isSelected ? 'bg-indigo-600 text-white border-indigo-400 scale-105 shadow-xl' : 
                  hasCheckedIn ? 'bg-slate-800 text-slate-400 border-slate-700 opacity-60' : 
                  'bg-slate-800 text-white border-slate-700 hover:border-slate-500'}`}
            >
              #{player.shirtNumber} {player.name}
              {hasCheckedIn && <div className="text-sm mt-1 text-green-400">✅ Bereit</div>}
            </button>
          );
        })}
      </div>

      {/* BOTTOM INPUT BAR (Only shows if a player is selected) */}
      {selectedPlayer && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.2)] p-4 md:p-6 animate-in slide-in-from-bottom-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-sm font-bold text-indigo-600 uppercase mb-2">
              👤 Ausgewählt: {selectedPlayer.name}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-4">
              <input 
                type="text" 
                placeholder="Was ist dein Fokus für heute?" 
                value={focusPoint}
                onChange={(e) => setFocusPoint(e.target.value)}
                required
                className="flex-1 p-4 bg-slate-100 border border-slate-300 rounded-xl text-lg text-black outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? '...' : 'Speichern'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}