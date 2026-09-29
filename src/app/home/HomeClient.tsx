'use client'

import { useState } from 'react';
import { sendFeedback, submitPollVote } from '../actions'; 
import { LEGACY_ATTENDANCE, LEGACY_TOTAL_SESSIONS } from '@/lib/attendanceConfig';

export default function HomeClient({ messages, currentUser, polls = [], allCheckIns = [] }: any) {
  const [feedback, setFeedback] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [pollAnswers, setPollAnswers] = useState<{[key: string]: string}>({});
  const [pollReasons, setPollReasons] = useState<{[key: string]: string}>({});
  const [submittingPoll, setSubmittingPoll] = useState<string | null>(null);

  const SEASON_START = new Date('2026-09-01');

  const calculateTrueAttendance = (playerName: string, checkIns: any[]) => {
    const legacyAttended = LEGACY_ATTENDANCE[playerName] || 0;
    
    const uniqueDates = new Set(
      checkIns.map(record => new Date(record.createdAt).toDateString())
    );
    const dbTotalSessions = uniqueDates.size;
    
    const dbAttended = checkIns.filter(record => record.playerName === playerName).length;
    
    const totalAttended = legacyAttended + dbAttended;
    const totalPossible = LEGACY_TOTAL_SESSIONS + dbTotalSessions;
    
    const percentage = totalPossible === 0 ? 0 : Math.round((totalAttended / totalPossible) * 100);
    
    return { totalAttended, totalPossible, percentage };
  };

  const playerStats = calculateTrueAttendance(currentUser.name, allCheckIns);

  // 1. Get all unique training dates in chronological order
  const uniqueDates = Array.from(new Set<string>(
    allCheckIns.map((record: any) => new Date(record.createdAt).toDateString())
  )).sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());

  // 2. Take the last 12 sessions so the row doesn't get infinitely long
  const recentTrainingDates = uniqueDates.slice(-12); 

  // 3. Map over those dates to check if the player was present
  const recentHistory = recentTrainingDates.map(date => {
    const attended = allCheckIns.some(
      (r: any) => r.playerName === currentUser.name && new Date(r.createdAt).toDateString() === date
    );
    // Format for the tooltip (e.g., "25. Sept")
    const d = new Date(date);
    const formattedDate = `${d.getDate()}. ${d.toLocaleString('de-CH', { month: 'short' })}`; 
    return { date: formattedDate, attended };
  });

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

      {/* Players attendance */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6">
        
        {/* Top Section: Stats & Ring */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Deine Trainingspräsenz</h3>
            <p className="text-3xl font-black text-indigo-600">{playerStats.percentage}%</p>
            <p className="text-xs text-slate-500 mt-1">{playerStats.totalAttended} von {playerStats.totalPossible} Trainings besucht</p>
          </div>
          
          {/* Circular Progress Indicator */}
          <div className="relative w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90 absolute">
              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-200" />
              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" 
                strokeDasharray="175" 
                strokeDashoffset={175 - (175 * playerStats.percentage) / 100} 
                className={playerStats.percentage >= 80 ? "text-emerald-500" : playerStats.percentage >= 60 ? "text-amber-500" : "text-red-500"} 
              />
            </svg>
            <span className="text-xl">🏐</span>
          </div>
        </div>

        {/* Bottom Section: Recent Trainings Squares */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Letzte Check-ins</p>
          <div className="flex gap-2 flex-wrap">
            {recentHistory.length > 0 ? recentHistory.map((session, i) => (
              <div 
                key={i} 
                title={session.date}
                className={`w-7 h-7 rounded-md flex items-center justify-center shadow-sm ${session.attended ? 'bg-emerald-500' : 'bg-red-500/80'}`}
              >
                 {session.attended ? <span className="text-white text-xs font-black">✓</span> : <span className="text-white text-[10px] font-black">✕</span>}
              </div>
            )) : (
              <span className="text-xs text-slate-400 italic">Noch keine digitalen Check-ins vorhanden.</span>
            )}
          </div>
        </div>

      </div>
      
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