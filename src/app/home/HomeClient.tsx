'use client'

import { useState } from 'react';
import { sendFeedback, submitPollVote } from '../actions'; 

export default function HomeClient({ messages, currentUser, polls = [] }: any) {
  const [feedback, setFeedback] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [pollAnswers, setPollAnswers] = useState<{[key: string]: string}>({});
  const [pollReasons, setPollReasons] = useState<{[key: string]: string}>({}); // NEW STATE FOR REASONS
  const [submittingPoll, setSubmittingPoll] = useState<string | null>(null);

  const SEASON_START = new Date('2026-09-01');

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

  const handlePollSubmit = async (pollId: string, requireReason: boolean) => {
    const answer = pollAnswers[pollId];
    const reason = pollReasons[pollId] || "";

    if (!answer) return;
    
    // Block submission if reason is required but empty
    if (requireReason && !reason.trim()) {
      alert("Bitte gib eine Begründung an!");
      return;
    }
    
    setSubmittingPoll(pollId);
    // Pass the reason to the backend!
    const res = await submitPollVote(pollId, currentUser.shirtNumber, currentUser.name, answer, reason);
    
    if (res?.error) {
      alert(res.error);
    }
    setSubmittingPoll(null);
  };

  return (
    <div className="space-y-8">
      
      {/* TEAM POLLS SECTION */}
      {polls.length > 0 && (
        <div className="space-y-4">
          {polls.map((poll: any) => (
            <div key={poll._id} className="bg-indigo-600 rounded-2xl shadow-md p-6 text-white border border-indigo-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-indigo-500 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                  Team Umfrage
                </span>
              </div>
              <h2 className="text-lg font-bold mb-4">{poll.question}</h2>
              
              {poll.type === 'options' ? (
                <div className="space-y-2 mb-4">
                  {poll.options.map((opt: string) => (
                    <label key={opt} className="flex items-center gap-3 bg-indigo-700/50 p-3 rounded-xl cursor-pointer hover:bg-indigo-500 transition-colors border border-indigo-500/30">
                      <input 
                        type="radio" name={`poll-${poll._id}`} value={opt}
                        checked={pollAnswers[poll._id] === opt}
                        onChange={(e) => setPollAnswers({...pollAnswers, [poll._id]: e.target.value})}
                        className="text-indigo-400 focus:ring-indigo-400 w-4 h-4"
                      />
                      <span className="text-sm font-medium">{opt}</span>
                    </label>
                  ))}
                  
                  {/* Show the reason box if they selected an option AND the poll requires it */}
                  {poll.requireReason && pollAnswers[poll._id] && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                      <textarea 
                        placeholder="Warum hast du das gewählt? (Pflichtfeld)"
                        value={pollReasons[poll._id] || ''}
                        onChange={(e) => setPollReasons({...pollReasons, [poll._id]: e.target.value})}
                        className="w-full p-3 bg-indigo-800/50 border border-indigo-500/50 rounded-xl text-sm text-white placeholder-indigo-300 h-20 outline-none focus:border-indigo-300"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <textarea 
                  placeholder="Deine Antwort..."
                  value={pollAnswers[poll._id] || ''}
                  onChange={(e) => setPollAnswers({...pollAnswers, [poll._id]: e.target.value})}
                  className="w-full p-3 bg-indigo-700/50 border border-indigo-500/30 rounded-xl text-sm text-white placeholder-indigo-300 h-24 outline-none focus:border-indigo-400 mb-4"
                />
              )}

              <button 
                onClick={() => handlePollSubmit(poll._id, poll.requireReason)}
                disabled={submittingPoll === poll._id || !pollAnswers[poll._id] || (poll.requireReason && !pollReasons[poll._id]?.trim())}
                className="w-full bg-white text-indigo-700 font-bold py-3 rounded-xl transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 mt-2"
              >
                {submittingPoll === poll._id ? 'Wird gespeichert...' : 'Abstimmen'}
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* POSTFACH (Inbox) */}
      {messages.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Dein Postfach 📥</h2>
          <div className="space-y-3">
            {messages.map((msg: any) => {
              const isOldMessage = new Date(msg.createdAt) < SEASON_START;

              return (
                <div key={msg._id} className={`p-4 border rounded-xl transition-all ${isOldMessage ? 'bg-slate-100 border-slate-200 opacity-75' : 'bg-indigo-50 border-indigo-100'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-xs font-bold uppercase flex items-center gap-2 ${isOldMessage ? 'text-slate-500' : 'text-indigo-600'}`}>
                      {msg.playerName === "ExtraPunkt" ? "🏆 Extra Punkt" : msg.playerName}
                      {isOldMessage && <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded text-[9px] tracking-wider">LETZTE SAISON</span>}
                    </span>
                    <span className="text-[10px] text-slate-400">{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className={`text-sm leading-relaxed ${isOldMessage ? 'text-slate-500' : 'text-slate-700'}`}>{msg.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FEEDBACK TO TRAINER */}
      <div className="bg-slate-800 rounded-2xl shadow-xl p-6 text-white">
        <h2 className="text-lg font-bold mb-1">Nachricht an Yasha 📬</h2>
        <p className="text-xs text-slate-400 mb-4">Feedback zu Übungen, Training oder anderem.</p>
        <form onSubmit={handleSendFeedback} className="space-y-4">
          <textarea 
            value={feedback} onChange={(e) => setFeedback(e.target.value)} required placeholder="Deine Nachricht..."
            className="w-full p-4 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-400 h-28 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="w-4 h-4 rounded text-indigo-500"/>
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