'use client'

import { useState, useEffect } from 'react';
import { createExercise, deleteExercise } from '../actions'; 
// Note: Make sure you also have a way to fetch exercises, 
// or pass them as props if you use a Server Component. 
// For now, let's assume a simple client-side fetch or state.

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // MOCK PLAYER - Replace this with your real Auth/Session logic
  const currentPlayer = { name: "Player Name", shirtNumber: 7 }; 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = { title, description, videoLink };
    const res = await createExercise(formData, currentPlayer);

    if (res?.success) {
      setTitle('');
      setDescription('');
      setVideoLink('');
      // Ideally, re-fetch or update local state here
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Möchtest du diesen Vorschlag wirklich löschen?")) {
      await deleteExercise(id, currentPlayer.shirtNumber);
      // Update local state to remove the item
      setExercises(exercises.filter(ex => ex._id !== id));
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-10">
        
        {/* CREATE FORM */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Neue Übung vorschlagen</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title Input: ADDED text-black */}
            <input 
            type="text" placeholder="Titel der Übung" value={title}
            onChange={(e) => setTitle(e.target.value)} 
            className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-800 text-black placeholder:text-slate-400"
            />
            {/* Description Textarea: ADDED text-black */}
            <textarea 
            placeholder="Beschreibung (Wie funktioniert die Übung?)" value={description}
            onChange={(e) => setDescription(e.target.value)} 
            className="w-full p-3 bg-slate-50 border rounded-xl h-32 outline-none focus:ring-2 focus:ring-indigo-800 text-black placeholder:text-slate-400"
            />
            {/* Video Input: ADDED text-black */}
            <input 
            type="url" placeholder="Video Link (YouTube/Instagram) - Optional" value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
            className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-800 text-black placeholder:text-slate-400"
            />
            <button 
            type="submit" disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
            {isSubmitting ? 'Wird gespeichert...' : 'Vorschlag posten'}
            </button>
        </form>
        </section>

        {/* EXERCISES LIST */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-slate-700 px-2">Alle Vorschläge</h2>
          {exercises.length === 0 ? (
            <p className="text-slate-400 italic px-2">Noch keine Vorschläge vorhanden. Sei die Erste!</p>
          ) : (
            exercises.map((ex) => (
              <div key={ex._id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative group">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-indigo-900">{ex.title}</h3>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase font-bold">
                    Von: {ex.playerName}
                  </span>
                </div>
                <p className="text-slate-600 text-sm whitespace-pre-wrap mb-4 leading-relaxed">
                  {ex.description}
                </p>
                {ex.videoLink && (
                  <a 
                    href={ex.videoLink} target="_blank" rel="noreferrer"
                    className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1"
                  >
                    🎥 Video ansehen
                  </a>
                )}
                
                {/* DELETE BUTTON - Only shows if it's the player's own post */}
                {ex.createdBy === currentPlayer.shirtNumber && (
                  <button 
                    onClick={() => handleDelete(ex._id)}
                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"
                    title="Löschen"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}