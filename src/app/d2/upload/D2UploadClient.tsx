'use client';

import { useState } from 'react';
import Link from 'next/link';

interface MatchItem {
  _id: string;
  date: string;
  opponent: string;
  isHome: boolean;
  setsWon: number;
  setsLost: number;
  setScores: string[];
}

export default function D2UploadClient({
  initialMatches,
}: {
  initialMatches: MatchItem[];
}) {
  const [matches, setMatches] = useState<MatchItem[]>(initialMatches);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setStatusMsg(null);

    const newlyAdded: MatchItem[] = [];

    try {
      for (const file of Array.from(files)) {
        const rawText = await file.text();
        const res = await fetch('/api/d2-matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText, teamKeyword: 'D2' }),
        });
        const data = await res.json();
        if (data.success && data.match) {
          newlyAdded.push(data.match);
        } else {
          alert(`Fehler bei ${file.name}: ${data.error || 'Unbekannter Fehler'}`);
        }
      }

      if (newlyAdded.length > 0) {
        setMatches((prev) =>
          [...newlyAdded, ...prev].sort((a, b) => b.date.localeCompare(a.date))
        );
        setStatusMsg(
          `✅ ${newlyAdded.length} Match${newlyAdded.length > 1 ? 'es' : ''} erfolgreich importiert!`
        );
      }
    } catch {
      alert('Verbindungsfehler beim Hochladen.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, opponent: string) => {
    if (!confirm(`Match gegen ${opponent} wirklich löschen?`)) return;
    try {
      const res = await fetch(`/api/d2-matches?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMatches((prev) => prev.filter((m) => m._id !== id));
      }
    } catch {
      alert('Fehler beim Löschen.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        {/*<div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-wide">📂 D2 .dvw Upload</h1>
            <p className="text-xs text-slate-400 mt-1">
              VolleyStation-Exporte hochladen &amp; verwalten
            </p>
          </div>
          <Link
            href="/d2/stats"
            className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-xs sm:text-sm font-black shadow-lg transition-all"
          >
            📊 Zu den Stats →
          </Link>
        </div>
        */}

        {/* Upload Dropzone */}
        <label className="block cursor-pointer bg-slate-800/60 hover:bg-slate-800 border-2 border-dashed border-emerald-500/50 hover:border-emerald-400 rounded-3xl p-10 text-center transition-all">
          <div className="text-4xl mb-2">{isUploading ? '⏳' : '📂'}</div>
          <div className="text-base font-black text-white">
            {isUploading ? 'Importiere .dvw Dateien...' : '.dvw Dateien auswählen'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Mehrfachauswahl möglich · Automatische Heim/Auswärts-Erkennung für D2
          </div>
          <input
            type="file"
            accept=".dvw"
            multiple
            disabled={isUploading}
            onChange={(e) => {
              handleFileUpload(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />
        </label>

        {statusMsg && (
          <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl text-sm font-bold text-center">
            {statusMsg}
          </div>
        )}

        {/* Uploaded Matches List */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-5 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Gespeicherte Matches ({matches.length})
          </h2>

          {matches.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Noch keine Matches vorhanden.</p>
          ) : (
            <div className="space-y-2.5">
              {matches.map((m) => {
                const won = m.setsWon > m.setsLost;
                return (
                  <div
                    key={m._id}
                    className="bg-slate-900/60 border border-slate-700 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-black text-white">vs. {m.opponent}</span>
                      <span className="ml-2 text-xs text-slate-400">{m.date}</span>
                      <span className="ml-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {m.isHome ? 'Heim' : 'Auswärts'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-mono">
                        {m.setScores.join(' · ')}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-black ${
                          won
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {m.setsWon} : {m.setsLost}
                      </span>
                      <button
                        onClick={() => handleDelete(m._id, m.opponent)}
                        title="Match löschen"
                        className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-red-600/80 text-slate-400 hover:text-white transition-all"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}