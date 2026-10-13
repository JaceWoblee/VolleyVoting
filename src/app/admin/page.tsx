export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Vote from '@/models/Vote';
import Message from '@/models/Message';
import ResetButton from './ResetButton';
import PollManager from './PollManager';
import Poll from '@/models/Poll';
import PollVote from '@/models/PollVote';
import { syncUserVotes, exemptPlayer } from '../actions';
import FeedbackList from './FeedbackList';
import PlayerManager from './PlayerManager';

const SEASON_START = new Date('2026-09-01');

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');

  if (!session || session.value !== 'authenticated') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm text-center border border-slate-200">
          <h1 className="text-xl font-bold text-slate-800">🔐 Restricted Access</h1>
          <p className="text-slate-500 mt-2">Please log in as Coach to access this dashboard.</p>
          <br />
          <a href="/" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-sm">
            ← Zurück zum Login
          </a>
        </div>
      </main>
    );
  }

  await dbConnect();

  const votes = await Vote.find({ createdAt: { $gte: SEASON_START } });
  const users = await User.find({ shirtNumber: { $nin: [0, 1] } }).sort({ shirtNumber: 1 });
  
  const messages = await Message.find({}).sort({ createdAt: -1 });
  const feedbackForAdmin = messages.filter((m: any) => m.forPlayer == false);

  const rawPolls = await Poll.find({}).sort({ createdAt: -1 });
  const polls = JSON.parse(JSON.stringify(rawPolls));
  
  const rawPollVotes = await PollVote.find({});
  const pollVotes = JSON.parse(JSON.stringify(rawPollVotes));

  const totals = votes.reduce((acc: any, vote: any) => {
    if (vote.mentalSupport) {
      acc[vote.mentalSupport] = (acc[vote.mentalSupport] || 0) + 1;
    }
    if (vote.bonusTarget) {
      acc[vote.bonusTarget] = (acc[vote.bonusTarget] || 0) + 1;
    }
    return acc;
  }, {});

  const pendingVoters = users.filter(u => !u.hasVoted);

  // This calculates progressive milestones: 15, then 25, then 35...
  const calculateGiftProgress = (totalVotes: number) => {
    let gifts = 0;
    let votesRemaining = totalVotes;
    let nextMilestone = 15; 

    // Keep subtracting the milestone amount until they don't have enough votes left
    while (votesRemaining >= nextMilestone) {
      gifts++;
      votesRemaining -= nextMilestone;
      nextMilestone += 10; // Increase the requirement by 10 for the next tier
    }

    return { 
      giftsEarned: gifts, 
      progress: votesRemaining, 
      currentTarget: nextMilestone 
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-black">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-indigo-600">Dashboard</h1>
          <div className="flex gap-4">
            <a href="/" className="bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2">
              🏠 Home
            </a>
            <a href="/exercises" className="bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2">
              🏋️ Übungen
            </a>
            <a href="/admin/surveyanswers" className="bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2">
              📊 Umfrage
            </a>
            <a href="/admin/attendance" className="bg-indigo-600 border border-indigo-700 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2">
              📈 Attendance
            </a>
          </div>
        </div>

        {/* SECTION 1: PARTICIPATION & MANAGEMENT */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4">📬 Missing Votes ({pendingVoters.length})</h2>
            <div className="flex flex-wrap gap-2">
              {pendingVoters.length > 0 ? (
                pendingVoters.map(u => (
                  <form key={u.shirtNumber} action={async () => { "use server"; await exemptPlayer(u.shirtNumber); }}>
                    <button 
                      type="submit" 
                      title="Click to excuse this player from voting"
                      className="bg-amber-100 hover:bg-amber-200 hover:scale-105 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      #{u.shirtNumber} {u.name} <span>✖</span>
                    </button>
                  </form>
                ))
              ) : (
                <p className="text-green-600 font-medium">✅ Team participation 100%!</p>
              )}
            </div>
          </div>
            {/* REPLACED: Full dynamic Player Manager */}
            <PlayerManager users={JSON.parse(JSON.stringify(users))} />
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
                .filter(([name]) => name !== "Dummy Name") // <--- Add this line
                .sort((a: any, b: any) => b[1] - a[1])
                .map(([name, count]: any) => {
                  const { giftsEarned, progress, currentTarget } = calculateGiftProgress(count);
                  
                  return (
                    <tr key={name} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium">{name}</td>
                      <td className="p-4 text-center font-bold text-indigo-600">{count}</td>
                      <td className="p-4 text-center text-xl">{giftsEarned} 🎁</td>
                      <td className="p-4 min-w-[150px]">
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div 
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${(progress / currentTarget) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-[9px] mt-1 text-slate-400 font-bold uppercase tracking-wider">
                          {progress} / {currentTarget} Points
                        </p>
                      </td>
                    </tr>
                  );
              })}
            </tbody>
          </table>
        </div>

        {/* SECTION 3: MESSAGES */}
        <FeedbackList 
          messages={feedbackForAdmin.map((m: any) => ({
            _id: m._id.toString(),
            text: m.text,
            isAnonymous: m.isAnonymous,
            playerName: m.playerName,
            createdAt: m.createdAt.toISOString()
          }))} 
        />

        <PollManager polls={polls} pollVotes={pollVotes} />

        {/* SECTION 4: SYSTEM TOOLS */}
        <div className="pt-8 border-t border-slate-200 flex gap-4 items-start">
          <form action={async () => { "use server"; await syncUserVotes(); }}>
          </form>
          <ResetButton />
        </div>

      </div>
    </div>
  );
}