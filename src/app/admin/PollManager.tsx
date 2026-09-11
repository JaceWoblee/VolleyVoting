'use client';

import { useState } from 'react';
import { createPoll, togglePollStatus } from '../actions';

export default function PollManager({ polls, pollVotes }: { polls: any[], pollVotes: any[] }) {
  const [question, setQuestion] = useState('');
  const [type, setType] = useState<'text' | 'options'>('options');
  const [options, setOptions] = useState('');
  const [requireReason, setRequireReason] = useState(false); // NEW STATE
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <h2 className="text-xl font-bold p-6 bg-slate-50 border-b">📊 Team Polls</h2>
      
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Question</label>
            <input 
              required type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Wo sollen wir ins Trainingslager?"
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={type === 'options'} onChange={() => setType('options')} className="text-indigo-600 focus:ring-indigo-500"/>
              <span className="text-sm text-slate-700">Multiple Choice</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={type === 'text'} onChange={() => setType('text')} className="text-indigo-600 focus:ring-indigo-500"/>
              <span className="text-sm text-slate-700">Text Response</span>
            </label>
          </div>

          {type === 'options' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Options (comma separated)</label>
                <input 
                  required type="text" value={options} onChange={(e) => setOptions(e.target.value)}
                  placeholder="Basel, Zürich, Bern"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              {/* NEW CHECKBOX */}
              <label className="flex items-center gap-2 cursor-pointer bg-slate-100 p-3 rounded-lg border border-slate-200">
                <input 
                  type="checkbox" checked={requireReason} onChange={(e) => setRequireReason(e.target.checked)}
                  className="text-indigo-600 rounded"
                />
                <span className="text-sm font-medium text-slate-700">Begründung verlangen? (Fügt ein Textfeld hinzu)</span>
              </label>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50">
            {isSubmitting ? 'Creating...' : 'Publish Poll'}
          </button>
        </form>
      </div>

      <div className="p-6 space-y-6">
        {polls.length === 0 ? (
          <p className="text-slate-500 text-sm italic">No polls created yet.</p>
        ) : (
          polls.map((poll) => {
            const votesForThisPoll = pollVotes.filter(v => v.pollId === poll._id);
            
            return (
              <div key={poll._id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{poll.question}</h3>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${poll.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                      {poll.isActive ? 'Active' : 'Closed'}
                    </span>
                  </div>
                  <button onClick={() => togglePollStatus(poll._id, poll.isActive)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded font-bold">
                    {poll.isActive ? 'Close Poll' : 'Reopen'}
                  </button>
                </div>

                {votesForThisPoll.length === 0 ? (
                  <p className="text-sm text-slate-400">No votes yet.</p>
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
                                <span className="font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded text-xs">{votesForOpt.length} votes</span>
                              </div>
                              
                              {/* Render reasons if required */}
                              {poll.requireReason && votesForOpt.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                                  {votesForOpt.map(v => (
                                    <div key={v._id} className="text-sm bg-white p-2 rounded border border-slate-100">
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
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {votesForThisPoll.map(v => (
                          <div key={v._id} className="text-sm bg-slate-50 p-2 rounded">
                            <span className="font-bold text-xs text-indigo-600 uppercase block mb-1">{v.playerName}</span>
                            <span className="text-slate-700">{v.answer}</span>
                          </div>
                        ))}
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
  );
}