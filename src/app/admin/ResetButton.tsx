'use client'; // This allows for onClick and confirm()

import { startNewMatch } from '../actions';

export default function ResetButton() {
  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all vote blockers for a new match?')) {
      await startNewMatch();
    }
  };

  return (
    <button 
      onClick={handleReset}
      className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-colors"
    >
      🚀 Start New Match
    </button>
  );
}