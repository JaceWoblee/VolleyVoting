export const dynamic = 'force-dynamic';

import dbConnect from '@/lib/db';
import TrainingFocus from '@/models/TrainingFocus';
import { resetTrainingSession } from '@/app/actions';

export default async function TrainingDashboard() {
  await dbConnect();
  
  // Get currently active focus points
  const rawFocuses = await TrainingFocus.find({ isActive: true }).sort({ createdAt: -1 });
  const activeFocuses = JSON.parse(JSON.stringify(rawFocuses));

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER & RESET BUTTON */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-700">Live Training</h1>
            <p className="text-slate-500">Heutige Fokus-Punkte des Teams</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <a href="/admin" className="text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors">← Dashboard</a>
            
            {/* NEW: Button to open the iPad Kiosk */}
            <a href="/kiosk" target="_blank" className="bg-indigo-100 text-indigo-700 px-4 py-3 rounded-xl font-bold hover:bg-indigo-200 transition-colors flex items-center gap-2">
              🖥️ Kiosk Öffnen
            </a>
            
            <form action={async () => { "use server"; await resetTrainingSession(); }}>
              <button className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-600 shadow-md transition-all">
                🔄 Session Beenden
              </button>
            </form>
          </div>
        </header>

        {/* FOCUS POINTS GRID */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <h2 className="text-xl font-bold mb-6">🎯 Eingecheckte Spieler ({activeFocuses.length})</h2>
           
           {activeFocuses.length === 0 ? (
             <div className="text-center text-slate-500 py-12 italic border-2 border-dashed border-slate-200 rounded-xl">
               Noch niemand eingecheckt. Das iPad (/kiosk) wartet auf Eingaben.
             </div>
           ) : (
             <div className="grid md:grid-cols-2 gap-4">
               {activeFocuses.map((focus: any) => (
                 <div key={focus._id} className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-indigo-500">
                   <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{focus.playerName}</span>
                   <p className="text-lg font-medium mt-1 leading-snug text-slate-800">{focus.focusPoint}</p>
                 </div>
               ))}
             </div>
           )}
        </div>

      </div>
    </main>
  );
}