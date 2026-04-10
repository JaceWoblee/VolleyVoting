'use client'

import { useState } from 'react';
import { sendFeedback } from '../actions';

export default function HomeClient({ messages, currentUser }: any) {
  const [feedback, setFeedback] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setIsSubmitting(true);
    
    const res = await sendFeedback(currentUser.shirtNumber, currentUser.name, feedback, isAnonymous);
    if (!res?.error) {
      alert("Nachricht an Coach gesendet!");
      setFeedback('');
      setIsAnonymous(false); 
    } else {
      alert("Fehler beim Senden.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-8">
      {/* POSTFACH (Inbox) */}
      {messages.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Dein Postfach 📥</h2>
          <div className="space-y-3">
            {messages.map((msg: any) => (
              <div key={msg._id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-indigo-600 uppercase">
                    {msg.playerName === "ExtraPunkt" ? "🏆 Extra Punkt" : msg.playerName}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{msg.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FEEDBACK TO TRAINER */}
      <div className="bg-slate-800 rounded-2xl shadow-xl p-6 text-white">
        <h2 className="text-lg font-bold mb-1">Nachricht an Coach Yasha 📬</h2>
        <p className="text-xs text-slate-400 mb-4">Ideen, Abmeldungen oder Feedback.</p>
        
        <form onSubmit={handleSendFeedback} className="space-y-4">
          <textarea 
            value={feedback} onChange={(e) => setFeedback(e.target.value)} required
            placeholder="Deine Nachricht..."
            className="w-full p-4 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-400 h-28 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-500"
              />
              <span className="text-xs text-slate-300 font-medium">Anonym senden?</span>
            </label>
            <button type="submit" disabled={isSubmitting} className="bg-indigo-600 px-6 py-2 rounded-xl font-bold text-sm hover:bg-indigo-500 transition-colors disabled:opacity-50">
              {isSubmitting ? 'Sende...' : 'Senden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}