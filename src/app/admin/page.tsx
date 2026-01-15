export const dynamic = 'force-dynamic';
import Vote from '@/models/Vote';
import User from '@/models/User';
import dbConnect from '@/lib/db';
import ResetButton from './ResetButton';
import { startNewMatch, seedTeam, resetPlayerPin } from '../actions';
import { cookies } from 'next/headers';
import Message from '@/models/Message';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');

  if (!session || session.value !== 'authenticated') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm text-center border border-slate-200">
          <h1 className="text-xl font-bold text-slate-800">🔐 Restricted Access</h1>
          <p className="text-slate-500 mt-2">Please log in as Coach to access this dashboard.</p>
        </div>
      </main>
    );
  }

  await dbConnect();

  const votes = await Vote.find({});
  const users = await User.find({ shirtNumber: { $ne: 0 } }).sort({ shirtNumber: 1 });
  const messages = await Message.find({}).sort({ createdAt: -1 });

  const totals = votes.reduce((acc: any, vote: any) => {
    if (vote.shield) acc[vote.shield] = (acc[vote.shield] || 0) + 1;
    if (vote.spark) acc[vote.spark] = (acc[vote.spark] || 0) + 1;
    if (vote.catalyst) acc[vote.catalyst] = (acc[vote.catalyst] || 0) + 1;
    return acc;
  }, {});

  const pendingVoters = users.filter(u => !u.hasVoted);
  const MILESTONE = 15;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-black">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-indigo-600">Dashboard</h1>
          <ResetButton /> 
        </div>

        {/* SECTION 1: PARTICIPATION & MANAGEMENT */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4">📬 Missing Votes ({pendingVoters.length})</h2>
            <div className="flex flex-wrap gap-2">
              {pendingVoters.length > 0 ? (
                pendingVoters.map(u => (
                  <span key={u.shirtNumber} className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold">
                    #{u.shirtNumber} {u.name}
                  </span>
                ))
              ) : (
                <p className="text-green-600 font-medium">✅ Team participation 100%!</p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4">👤 Player PIN Management</h2>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {users.map((user) => (
                <div key={user.shirtNumber} className="flex items-center justify-between text-sm border-b pb-1">
                  <span>#{user.shirtNumber} {user.name}</span>
                  <form action={async () => { "use server"; await resetPlayerPin(user.shirtNumber); }}>
                    <button className="text-[10px] bg-slate-100 hover:bg-red-100 px-2 py-1 rounded font-bold uppercase transition-colors">
                      Reset PIN
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 2: PILLARS PROGRESS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <h2 className="text-xl font-bold p-6 bg-slate-50 border-b">🏆 Pillars Progress</h2>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="p-4">Player</th>
                <th className="p-4 text-center">Total Votes</th>
                <th className="p-4 text-center">Gifts</th>
                <th className="p-4">Next Reward</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(totals)
                .sort((a: any, b: any) => b[1] - a[1])
                .map(([name, count]: any) => {
                  const progress = count % MILESTONE;
                  const giftsEarned = Math.floor(count / MILESTONE);
                  return (
                    <tr key={name} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium">{name}</td>
                      <td className="p-4 text-center font-bold text-indigo-600">{count}</td>
                      <td className="p-4 text-center text-xl">{giftsEarned} 🎁</td>
                      <td className="p-4 min-w-[150px]">
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${(progress / MILESTONE) * 100}%` }}></div>
                        </div>
                        <p className="text-[9px] mt-1 text-slate-400 font-bold uppercase tracking-wider">{progress} / {MILESTONE} Points</p>
                      </td>
                    </tr>
                  );
              })}
            </tbody>
          </table>
        </div>

        {/* SECTION 3: MESSAGES */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4">📥 Player Messages</h2>
          <div className="space-y-4">
            {messages.length > 0 ? (
              messages.map((msg: any) => (
                <div key={msg._id.toString()} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold">
                      {msg.isAnonymous === true ? (
                        <span className="text-slate-400 italic">Anonym</span>
                      ) : (
                        <span className="text-indigo-600">#{msg.shirtNumber} {msg.playerName}</span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400">{new Date(msg.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-700">{msg.text}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm italic">No messages yet.</p>
            )}
          </div>
        </div>

        {/* SECTION 4: SYSTEM TOOLS */}
        <div className="pt-8 border-t border-slate-200">
          <form action={async () => { "use server"; await seedTeam(); }}>
            <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded text-xs hover:bg-black transition-colors">
              ⚠️ RESET & RE-SEED ALL PLAYERS
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}