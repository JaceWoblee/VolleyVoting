import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Match from '@/models/Match';
import User from '@/models/User';
import MatchesClient from './MatchesClient';

export const dynamic = 'force-dynamic';

export default async function MatchesOverviewPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  if (!session || session.value !== 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <a href="/" className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg">← Login</a>
      </div>
    );
  }

  await dbConnect();

  // Load all finished matches sorted by newest first
  const rawMatches = await Match.find({ status: 'finished' }).sort({ createdAt: -1 });
  const matches = JSON.parse(JSON.stringify(rawMatches));

  // Load all players
  const rawUsers = await User.find({ shirtNumber: { $nin: [0, 1] } }).sort({ shirtNumber: 1 });
  const allPlayers = JSON.parse(JSON.stringify(rawUsers));

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-wider flex items-center gap-3">
              <span>🏐</span> Match Historie
            </h1>
            <p className="text-slate-400 text-sm mt-1">Alle absolvierten Matches mit Sätzen, Wechseln und Spielanteilen.</p>
          </div>
          <a 
            href="/admin/attendance" 
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            ← Zurück zu Attendance
          </a>
        </div>

        {/* Expandable Match List */}
        <MatchesClient matches={matches} allPlayers={allPlayers} />

      </div>
    </div>
  );
}