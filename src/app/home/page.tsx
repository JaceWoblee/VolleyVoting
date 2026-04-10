export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Message from '@/models/Message';
import HomeClient from './HomeClient'; // We will put the interactive bits here

export default async function PlayerHomePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('player_session');

  if (!session) redirect('/');

  await dbConnect();
  const shirtNumber = Number(session.value);
  const user = await User.findOne({ shirtNumber });
  
  if (!user) redirect('/');

  // Fetch Inbox Messages for this player
  const rawMessages = await Message.find({ shirtNumber, forPlayer: true }).sort({ createdAt: -1 });
  const messages = JSON.parse(JSON.stringify(rawMessages));

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 text-slate-900">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-extrabold text-indigo-700">Hallo, {user.name}!</h1>
            <p className="text-slate-500 text-sm">Willkommen im Team Dashboard</p>
          </div>
          <form action={async () => { "use server"; const { logout } = await import('@/app/actions'); await logout(); }}>
            <button className="text-sm font-bold text-slate-400 hover:text-red-500 transition-colors">Logout</button>
          </form>
        </header>

        {/* NAVIGATION GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Voting Card (Only shows if they haven't voted) */}
          {!user.hasVoted ? (
            <a href="/voting" className="block bg-indigo-600 text-white p-6 rounded-2xl shadow-md hover:bg-indigo-700 transition-all hover:-translate-y-1">
              <h2 className="text-xl font-bold mb-1">⭐ Match Voting</h2>
              <p className="text-indigo-200 text-sm">Wähle den MVP für das letzte Spiel.</p>
            </a>
          ) : (
            <div className="bg-slate-200 text-slate-400 p-6 rounded-2xl border border-slate-300 opacity-70">
              <h2 className="text-xl font-bold mb-1">✅ Match Voting</h2>
              <p className="text-sm">Du hast bereits abgestimmt!</p>
            </div>
          )}

          {/* Exercises Card */}
          <a href="/exercises" className="block bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-400 transition-all hover:-translate-y-1">
            <h2 className="text-xl font-bold text-slate-800 mb-1">🏋️ Übungen</h2>
            <p className="text-slate-500 text-sm">Vorschläge fürs nächste Training.</p>
          </a>

          {/* Survey Card */}
          <a href="/survey" className="block bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-400 transition-all hover:-translate-y-1 md:col-span-2">
            <h2 className="text-xl font-bold text-slate-800 mb-1">📋 Saison Feedback</h2>
            <p className="text-slate-500 text-sm">Fülle die anonyme Umfrage aus.</p>
          </a>
        </div>

        {/* INTERACTIVE CLIENT COMPONENT (Inbox & Feedback) */}
        <HomeClient messages={messages} currentUser={{ name: user.name, shirtNumber: user.shirtNumber }} />

      </div>
    </main>
  );
}