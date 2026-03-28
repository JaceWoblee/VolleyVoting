'use client'

import { useState } from 'react';
import { submitSurvey } from '../actions';

export default function SurveyPage() {
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [q3, setQ3] = useState('');
  const [q4, setQ4] = useState('');
  const [q5, setQ5] = useState('');
  const [q6, setQ6] = useState('');
  const [q7, setQ7] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q1.trim() || !q2.trim() || !q3.trim() || !q4.trim() || !q5.trim() || !q6.trim() || !q7.trim()) {
        return alert("Bitte beantworte alle Fragen, damit wir uns verbessern können!");
    }

    setIsSubmitting(true);
    const res = await submitSurvey(q1, q2, q3, q4, q5, q6, q7);
    
    if (res.error) {
      alert(res.error);
      setIsSubmitting(false);
    } else {
      setIsDone(true);
    }
  };

  if (isDone) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border border-slate-200">
          <h1 className="text-3xl font-bold text-indigo-600 mb-4">Yay</h1>
          <p className="text-slate-600">Dein Feedback wurde gespeichert. Danke für deine Ehrlichkeit.!</p>
          <a href="/" className="mt-6 inline-block bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm">Zurück zum Start</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 py-8 px-4 text-slate-900">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 border border-slate-200">
          <div className="mb-8 border-b border-slate-100 pb-6">
            <h1 className="text-3xl font-extrabold text-indigo-700 tracking-tight mb-2">Saison Feedback</h1>
            
            <p className="text-sm text-slate-800 font-bold">
              Bitte sei ehrlich und kritisch – nur so können wir uns als Team weiterentwickeln!
            </p>
            <p className="text-sm text-slate-800 font-bold">
              Das Feedback wird anonym gespeichert!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Question 1 */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">
                1. Was hilft dir im Training am meisten? Wovon sollten wir weniger tun?
              </label>
              <textarea 
                value={q1} onChange={(e) => setQ1(e.target.value)} required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Z.B Übungen oder Besprechungen/Erklärungen..."
              />
            </div>

            {/* Question 2 */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">
                2. Ist die Kommunikation an den Matches klar? Wenn nicht, was verwirrt dich?
              </label>
              <textarea 
                value={q2} onChange={(e) => setQ2(e.target.value)} required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Z.B. Timeouts oder vor/nach dem Spiel (oder anderes feedback zum Coaching)..."
              />
            </div>

            {/* Question 3 */}
            <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">
                3. Welche Übungen magst du am liebsten? Welche gar nicht? <br/>
                Bei welchen hast du das Gefühl, dass wir sie zu selten, zu oft oder zu lange machen?
            </label>
            <textarea 
                value={q3} onChange={(e) => setQ3(e.target.value)} required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Sei ruhig spezifisch! (z.B. Aufwärmspiele, Defence, etc.)"
            />
            </div>

            {/* Question 4 */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">
                4. Wenn du die neue Trainerin vom D5 werden würdest, was würdest du als erstes ändern? Was würdest du genau so machen?
              </label>
              <textarea 
                value={q4} onChange={(e) => setQ4(e.target.value)} required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Können auch mehrere dinge sein..."
              />
            </div>

            {/* Question 5 */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">
                5. Was hat dich diese Saison angetrieben, dein Bestes zu geben, ins Training zu kommen oder dich zu verbessern?
              </label>
              <textarea 
                value={q5} onChange={(e) => setQ5(e.target.value)} required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Können auch mehrere dinge sein..."
              />
            </div>

            {/* Question 6 */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">
                6. Würdest du die Webseite und das Voting-System nochmals in der nächsten Saison haben wollen? Warum Ja/Nein/Jein?
              </label>
              <textarea 
                value={q6} onChange={(e) => setQ6(e.target.value)} required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Auch generelles Feedback oder Anmerkungen zur Webseite sind willkommen :)"
              />
            </div>

            {/* Question 7 */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">
                7. Anderes Feedback
              </label>
              <textarea 
                value={q7} onChange={(e) => setQ7(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Optional"
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Wird gesendet...' : 'Absenden'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}