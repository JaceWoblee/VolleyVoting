'use client'

import { useState } from 'react';
import { handleVote } from '../actions';

export default function VotingClient({ 
  userName, 
  userNumber,
  roster 
}: { 
  userName: string, 
  userNumber: number,
  roster: { name: string, number: number }[] 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // DOUBLE FAILSAFE: Filter by Database Number OR by Fallback Text Name
  const safeDecodedName = decodeURIComponent(userName).trim().toLowerCase();
  
  const filteredRoster = roster.filter(player => {
    const isSameNumber = userNumber !== -1 && player.number === userNumber;
    const isSameName = player.name.trim().toLowerCase() === safeDecodedName;
    
    // Keep the player ONLY if both the number and name do NOT match the logged-in user
    return !isSameNumber && !isSameName;
  });

  const onVote = async (formData: FormData) => {
    setIsSubmitting(true);
    const result = await handleVote(formData); 
    
    if (result?.error) {
      alert(result.error);
      setIsSubmitting(false);
    } 
  };

  return (
    <main className="min-h-screen bg-slate-100 py-12 px-4 text-slate-900">
      <div className="max-w-md mx-auto space-y-6">
        
        <div className="flex justify-between items-center mb-6">
           <h1 className="text-3xl font-extrabold text-indigo-700 tracking-tight">Match Voting</h1>
           <a href="/home" className="text-sm text-slate-500 font-bold hover:text-indigo-600">Abbrechen</a>
        </div>

        <form action={onVote} className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200 space-y-6">
          
          <div className="text-center text-slate-500 font-medium italic pb-4 border-b border-slate-100">
            Hi, {decodeURIComponent(userName)}!
          </div>

          {/* VOTE 1: Mental Support */}
          <div>
            <label className="block text-sm font-bold uppercase text-indigo-600 mb-1">Mentale Unterstützung</label>
            <p className="text-[11px] text-slate-500 mb-3">Wer hat dir heute am meisten geholfen?</p>
            <select name="mentalSupport" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-black font-medium outline-none focus:border-indigo-500">
              <option value="">Wähle eine Spielerin...</option>
              {filteredRoster.map(player => (
                <option key={player.number} value={player.name}>{player.name}</option>
              ))}
            </select>
          </div>

          {/* VOTE 2: Extra Point + Mandatory Reason */}
          <div className="pt-4 border-t border-slate-100">
            <label className="block text-sm font-bold uppercase text-amber-500 mb-1">⭐ Extra Punkt & Nachricht</label>
            <p className="text-[11px] text-slate-500 mb-3">Begründe deinen Extra-Punkt.</p>
            
            <select name="bonusTarget" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-black font-medium mb-3 outline-none focus:border-amber-500">
              <option value="">Wer bekommt den Extra-Punkt?</option>
              {filteredRoster.map(player => (
                <option key={player.number} value={player.name}>{player.name}</option>
              ))}
            </select>
            
            <textarea 
              name="bonusReason" required
              placeholder="Feedback"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-black h-28 outline-none focus:border-amber-500"
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all">
            {isSubmitting ? 'Speichert...' : 'Vote Absenden'}
          </button>
        </form>
      </div>
    </main>
  );
}