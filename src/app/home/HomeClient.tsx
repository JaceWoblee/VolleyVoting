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
      {/* TRAINING CHECK-IN */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-1">🎯 Trainings-Fokus</h2>
        <p className="text-xs text-slate-500 mb-4">Was ist dein Hauptziel für das heutige Training?</p>
        
        <form action={async (formData) => {
          const focus = formData.get('focusPoint') as string;
          if (!focus.trim()) return;
          // You might need to import submitTrainingFocus at the top of this file!
          const { submitTrainingFocus } = await import('../actions');
          await submitTrainingFocus(currentUser.shirtNumber, currentUser.name, focus);
          alert("Fokus gesetzt! Viel Spaß im Training.");
        }} className="flex gap-2">
          <input 
            type="text" name="focusPoint" required placeholder="z.B. Block-Timing, lauter rufen..."
            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 text-black"
          />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">
            Setzen
          </button>
        </form>
      </div>

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
        <p className="text-xs text-slate-400 mb-4">Feedback zu Übungen, Training oder anderem.</p>
        
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