'use client';

import { useState } from 'react';
import { createPoll, togglePollStatus } from '../actions';

export default function PollManager({ polls, pollVotes }: { polls: any[], pollVotes: any[] }) {
  // Top-level collapse state for the entire Polls section
  const [isOpen, setIsOpen] = useState(false);

  // Poll creation state
  const [question, setQuestion] = useState('');
  const [type, setType] = useState<'text' | 'options'>('options');
  const [options, setOptions] = useState('');
  const [requireReason, setRequireReason] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Individual card expansion state
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);

  const activePollsCount = polls.filter(p => p.isActive).length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await createPoll(question, type, options, requireReason);
    if (res?.error) {
      alert(res.error);
    } else {
      setQuestion('');
      setOptions('');
      setRequireReason(false);
      alert("Poll created successfully!");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all">
      
      {/* TOP-LEVEL COLLAPSIBLE HEADER */}
      <div 
        onClick={() => setIsOpen(prev => !prev)}
        className="p-6 bg-slate-50 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between select-none transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Team Polls</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {polls.length} {polls.length === 1 ? 'Umfrage' : 'Umfragen'} gesamt • {activePollsCount} aktiv
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activePollsCount > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
              {activePollsCount} aktiv
            </span>
          )}
          <span className="text-slate-400 text-sm font-bold transition-transform duration-200">
            {isOpen ? '▲ Schliessen' : '▼ Öffnen'}
          </span>
        </div>
      </div>

      {/* EXPANDED CONTENT (Form + Sub-Cards) */}
      {isOpen && (
        <div className="border-t border-slate-200 divide-y divide-slate-100">
          
          {/* CREATION FORM */}
          <div className="p-6 bg-slate-50/50">
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Question</label>
                <input 
                  required 
                  type="text" 
                  value={question} 
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., Wo sollen wir ins Trainingslager?"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-800"
                />
              </div>

              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={type === 'options'} 
                    onChange={() => setType('options')} 
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Multiple Choice</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={type === 'text'} 
                    onChange={() => setType('text')} 
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Text Response</span>
                </label>
              </div>

              {type === 'options' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Options (comma separated)</label>
                    <input 
                      required 
                      type="text" 
                      value={options} 
                      onChange={(e) => setOptions(e.target.value)}
                      placeholder="Basel, Zürich, Bern"
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-800"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-slate-100 p-3 rounded-lg border border-slate-200">
                    <input 
                      type="checkbox" 
                      checked={requireReason} 
                      onChange={(e) => setRequireReason(e.target.checked)}
                      className="text-indigo-600 rounded"
                    />
                    <span className="text-sm font-medium text-slate-700">Begründung verlangen? (Fügt ein Textfeld hinzu)</span>
                  </label>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 text-sm shadow-sm"
              >
                {isSubmitting ? 'Creating...' : 'Publish Poll'}
              </button>
            </form>
          </div>

          {/* INDIVIDUAL POLL SUB-CARDS */}
          <div className="p-6 space-y-3">
            {polls.length === 0 ? (
              <p className="text-slate-500 text-sm italic">No polls created yet.</p>
            ) : (
              polls.map((poll) => {
                const votesForThisPoll = pollVotes.filter(v => v.pollId === poll._id);
                const isSubCardExpanded = expandedPollId === poll._id;

                return (
                  <div 
                    key={poll._id} 
                    className="border border-slate-200 rounded-xl overflow-hidden transition-all shadow-xs"
                  >
                    {/* SUB-CARD HEADER */}
                    <div 
                      onClick={() => setExpandedPollId(isSubCardExpanded ? null : poll._id)}
                      className="p-4 bg-slate-50 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between gap-4 select-none transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span 
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${poll.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                          title={poll.isActive ? 'Active' : 'Closed'}
                        />
                        <div className="truncate">
                          <h3 className="font-bold text-base text-slate-800 truncate">{poll.question}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {poll.type === 'options' ? 'Multiple Choice' : 'Text'} • {votesForThisPoll.length} Stimmen {poll.requireReason ? '• Mit Begründung' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${poll.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                          {poll.isActive ? 'Active' : 'Closed'}
                        </span>
                        <span className="text-slate-400 text-xs transition-transform duration-200">
                          {isSubCardExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* SUB-CARD EXPANDED DETAILS */}
                    {isSubCardExpanded && (
                      <div className="p-5 bg-white border-t border-slate-100 space-y-4">
                        
                        {/* Status Toggle Action */}
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                          <span className="text-xs text-slate-500 font-medium">Status der Abstimmung</span>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePollStatus(poll._id, poll.isActive);
                            }} 
                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md font-bold transition-colors"
                          >
                            {poll.isActive ? 'Close Poll' : 'Reopen'}
                          </button>
                        </div>

                        {/* Votes breakdown */}
                        {votesForThisPoll.length === 0 ? (
                          <p className="text-sm text-slate-400 italic">No votes yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {poll.type === 'options' ? (
                              <div className="space-y-3">
                                {poll.options.map((opt: string) => {
                                  const votesForOpt = votesForThisPoll.filter(v => v.answer === opt);
                                  return (
                                    <div key={opt} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                      <div className="flex justify-between items-center">
                                        <span className="font-medium text-slate-700">{opt}</span>
                                        <span className="font-bold text-indigo-600 bg-indigo-100 px-2.5 py-0.5 rounded text-xs">
                                          {votesForOpt.length} votes
                                        </span>
                                      </div>
                                      
                                      {poll.requireReason && votesForOpt.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                                          {votesForOpt.map((v: any) => (
                                            <div key={v._id} className="text-sm bg-white p-2.5 rounded border border-slate-100">
                                              <span className="font-bold text-xs text-indigo-500 mr-2">{v.playerName}:</span>
                                              <span className="text-slate-600 italic">"{v.reason || "Keine Begründung"}"</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                {votesForThisPoll.map((v: any) => (
                                  <div key={v._id} className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="font-bold text-xs text-indigo-600 uppercase block mb-1">{v.playerName}</span>
                                    <span className="text-slate-700">{v.answer}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

    </div>
  );
}