'use client'

import { useState } from 'react';
import { createExercise, deleteExercise, editExercise } from '../actions';

export default function ExerciseClient({ currentUser, initialExercises }: any) {
  const [exercises, setExercises] = useState(initialExercises);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // NEW: State to track if we are currently editing an exercise
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return alert("Titel und Beschreibung werden benötigt!");

    setIsSubmitting(true);

    if (editingId) {
      // EDIT MODE
      const res = await editExercise(editingId, { title, description, videoLink }, currentUser.shirtNumber);
      if (res?.success) window.location.reload();
      else alert("Fehler beim Bearbeiten.");
    } else {
      // CREATE MODE
      const res = await createExercise({ title, description, videoLink }, currentUser);
      if (res?.success) window.location.reload();
      else alert("Fehler beim Speichern.");
    }
    
    setIsSubmitting(false);
  };

  const handleEditClick = (ex: any) => {
    setEditingId(ex._id);
    setTitle(ex.title);
    setDescription(ex.description);
    setVideoLink(ex.videoLink || '');
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll up to the form
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setVideoLink('');
  };

  const handleDelete = async (id: string, creatorId: number) => {
    if (!currentUser.isAdmin && currentUser.shirtNumber !== creatorId) {
        return alert("Du kannst nur deine eigenen Vorschläge löschen!");
    }
    if (confirm("Wirklich löschen?")) {
      await deleteExercise(id, currentUser.shirtNumber);
      window.location.reload(); 
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-10">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
           <div>
             <h1 className="text-2xl font-bold text-slate-800">Hallo, {currentUser.name}! 👋</h1>
             <p className="text-sm text-slate-500">Hier kannst du Übungen für das Team vorschlagen.</p>
           </div>
           <a href="/home" className="text-sm font-bold text-indigo-600 hover:underline">Zurück</a>
        </div>

        {/* CREATE / EDIT FORM */}
        <section className={`p-6 rounded-2xl shadow-sm border transition-colors ${editingId ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-bold ${editingId ? 'text-amber-800' : 'text-slate-800'}`}>
              {editingId ? '✏️ Übung bearbeiten' : 'Neue Übung posten'}
            </h2>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="text-xs font-bold text-slate-400 hover:text-slate-600">
                Abbrechen
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input 
              type="text" placeholder="Titel der Übung" value={title} required
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-black font-bold shadow-inner"
            />
            <textarea 
              placeholder="Beschreibung..." value={description} required
              onChange={(e) => setDescription(e.target.value)} 
              className="w-full p-4 bg-white border border-slate-200 rounded-xl h-32 outline-none focus:ring-2 focus:ring-indigo-500 text-black shadow-inner"
            />
            <input 
              type="url" placeholder="Video Link (Optional)" value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-black shadow-inner"
            />
            <button 
              type="submit" disabled={isSubmitting}
              className={`w-full text-white py-4 rounded-xl font-bold transition-colors disabled:opacity-50 ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {isSubmitting ? 'Wird gespeichert...' : (editingId ? 'Änderungen speichern' : 'Vorschlag posten')}
            </button>
          </form>
        </section>

        {/* EXERCISES LIST */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-slate-700 px-2">Alle Vorschläge</h2>
          {exercises.length === 0 ? (
            <p className="text-slate-400 italic px-2">Noch keine Vorschläge vorhanden.</p>
          ) : (
            exercises.map((ex: any) => (
              <div key={ex._id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative group">
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-indigo-900 leading-tight">{ex.title}</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Von: {ex.playerName || 'Unbekannt'}
                  </span>
                </div>
                
                <p className="text-slate-600 text-sm whitespace-pre-wrap mb-4 leading-relaxed">
                  {ex.description}
                </p>

                {ex.videoLink && (
                  <a href={ex.videoLink} target="_blank" rel="noreferrer" className="text-indigo-600 text-xs font-bold hover:underline block mt-2">
                    🎥 Video ansehen
                  </a>
                )}
                
                {/* ACTIONS (EDIT & DELETE) */}
                {(ex.createdBy === currentUser.shirtNumber || currentUser.isAdmin) && (
                  <div className="absolute top-4 right-4 flex gap-3">
                    <button 
                      onClick={() => handleEditClick(ex)}
                      className="text-slate-300 hover:text-amber-500 transition-colors"
                      title="Bearbeiten"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(ex._id, ex.createdBy)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                      title="Löschen"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}