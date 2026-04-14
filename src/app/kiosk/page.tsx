export const dynamic = 'force-dynamic';

import dbConnect from '@/lib/db';
import User from '@/models/User';
import TrainingFocus from '@/models/TrainingFocus';
import KioskClient from './KioskClient';

export default async function KioskPage() {
  await dbConnect();
  
  // Get all players (except Coach 0)
  const roster = await User.find({ shirtNumber: { $ne: 0 } }).sort({ shirtNumber: 1 });
  
  // Find out who already checked in so we can mark them with a ✅
  const rawFocuses = await TrainingFocus.find({ isActive: true });
  const activeFocuses = JSON.parse(JSON.stringify(rawFocuses));
  const rosterData = JSON.parse(JSON.stringify(roster));

  return (
    <main className="min-h-screen bg-slate-900 pb-32 pt-6 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* NEW: Discreet link to Coach Dashboard */}
        <div className="flex justify-end mb-4">
          <a href="/admin/training" className="text-xs font-bold text-slate-600 hover:text-slate-400 transition-colors">
            Coach View 🔒
          </a>
        </div>

        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Training Check-In</h1>
          <p className="text-slate-400 mt-2">Wähle deinen Namen und setze deinen Fokus.</p>
        </header>

        <KioskClient roster={rosterData} activeFocuses={activeFocuses} />
      </div>
    </main>
  );
}