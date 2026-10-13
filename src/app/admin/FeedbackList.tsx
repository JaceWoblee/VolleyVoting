'use client';

import { useState } from 'react';

interface FeedbackMessage {
  _id: string;
  text: string;
  isAnonymous?: boolean;
  playerName?: string;
  createdAt: string;
}

export default function FeedbackList({ messages }: { messages: FeedbackMessage[] }) {
  const [showArchive, setShowArchive] = useState(false);

  // 14 days cutoff in milliseconds
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const recentMessages: FeedbackMessage[] = [];
  const olderMessages: FeedbackMessage[] = [];

  messages.forEach(msg => {
    const age = now - new Date(msg.createdAt).getTime();
    if (age <= fourteenDaysMs) {
      recentMessages.push(msg);
    } else {
      olderMessages.push(msg);
    }
  });

  const renderMessageCard = (msg: FeedbackMessage) => (
    <div key={msg._id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-xs">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-indigo-600 uppercase">
          {msg.isAnonymous ? "Anonym" : msg.playerName}
        </span>
        <span className="text-[10px] text-slate-400">
          {new Date(msg.createdAt).toLocaleDateString('de-CH')}
        </span>
      </div>
      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
        {msg.text}
      </p>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>📥</span> Player Feedback
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Nachrichten der letzten 14 Tage ({recentMessages.length})
          </p>
        </div>
      </div>

      {/* RECENT MESSAGES (Always displayed) */}
      {recentMessages.length > 0 ? (
        <div className="space-y-3">
          {recentMessages.map(renderMessageCard)}
        </div>
      ) : (
        <p className="text-slate-400 text-sm italic py-2">
          Keine neuen Nachrichten in den letzten 2 Wochen.
        </p>
      )}

      {/* OLDER MESSAGES ACCORDION */}
      {olderMessages.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowArchive(prev => !prev)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>🗄️</span> Ältere Nachrichten anzeigen ({olderMessages.length})
            </span>
            <span>{showArchive ? '▲ Schliessen' : '▼ Öffnen'}</span>
          </button>

          {showArchive && (
            <div className="space-y-3 mt-3 pt-1">
              {olderMessages.map(renderMessageCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}