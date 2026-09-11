'use client'; 

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// 1. Change seedPlayers to seedTeam here:
import { startNewMatch, seedTeam } from '../actions';

export default function ResetButton() {
  const router = useRouter();
  const [isReseeding, setIsReseeding] = useState(false);

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all vote blockers for a new match?')) {
      await startNewMatch();
      alert('New match started! Players can vote again.');
      router.refresh();
    }
  };

  const handleReseed = async () => {
    if (confirm("Are you sure? This will DELETE all current users and reload them from the hardcoded list!")) {
      setIsReseeding(true);
      // 2. Change seedPlayers() to seedTeam() here:
      const result = await seedTeam();
      setIsReseeding(false);

      if (result?.error) {
        alert(result.error);
      } else {
        alert("Players successfully imported for the new season!");
        router.refresh(); 
      }
    }
  };
  
  // ... rest of the button UI remains exactly the same ...

  return (
    <div className="mt-12 space-y-6">
      {/* Weekly Match Control */}
      <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-200">
        <h3 className="text-xl font-bold text-indigo-800 mb-2">Next Match</h3>
        <p className="text-sm text-indigo-600 mb-4">
          Reset the voting status so players can vote for the upcoming match.
        </p>
        <button 
          onClick={handleReset}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-colors"
        >
          🚀 Start New Match
        </button>
      </div>

      {/* New Season Control */}
      <div className="p-6 bg-red-50 rounded-2xl border border-red-200">
        <h3 className="text-xl font-bold text-red-800 mb-2">Danger Zone: New Season</h3>
        <p className="text-sm text-red-600 mb-4">
          Resetting the database will overwrite the active roster with the data from src/lib/players.ts.
        </p>
        <button 
          onClick={handleReseed}
          disabled={isReseeding}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 shadow-md"
        >
          {isReseeding ? "Importing Roster..." : "⚠️ Reset & Reseed All Players"}
        </button>
      </div>
    </div>
  );
}