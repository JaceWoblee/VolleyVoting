'use client'

import { useState } from 'react';
import { createExercise, deleteExercise } from '../actions';

export default function ExerciseClient({ currentUser, initialExercises }: any) {
  const [exercises, setExercises] = useState(initialExercises);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await createExercise({ title, description, videoLink }, currentUser);
    if (res?.success) {
      setTitle(''); setDescription(''); setVideoLink('');
      window.location.reload(); // Quick way to refresh server data
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Löschen?")) {
      await deleteExercise(id, currentUser.shirtNumber);
      setExercises(exercises.filter((ex: any) => ex._id !== id));
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="flex justify-between items-center">
           <h1 className="text-2xl font-bold">Hallo, {currentUser.name}! 👋</h1>
           <a href="/" className="text-xs text-slate-400">Zurück</a>
        </div>

        {/* Create Form - Everyone logged in can see this */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           {/* ... Your form code ... */}
        </section>

        {/* Exercises List */}
        <section className="space-y-6">
          {exercises.map((ex: any) => (
            <div key={ex._id} className="bg-white p-6 rounded-2xl border relative group">
              <h3 className="font-bold text-indigo-900">{ex.title}</h3>
              <p className="text-xs text-slate-400 mb-2">Von: {ex.playerName || 'Unbekannt'}</p>
              
              <p className="text-sm text-slate-600">{ex.description}</p>

              {/* DELETE BUTTON LOGIC */}
              {(ex.createdBy === currentUser.shirtNumber || currentUser.isAdmin) && (
                <button onClick={() => handleDelete(ex._id)} className="absolute top-4 right-4 text-red-400 hover:text-red-600">
                  🗑️
                </button>
              )}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}