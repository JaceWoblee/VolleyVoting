import dbConnect from '@/lib/db';
import CheckIn from '@/models/CheckIn';
import User from '@/models/User';
import MatchBoardClient from './MatchBoardClient';

export const dynamic = 'force-dynamic';

export default async function MatchPage() {
  await dbConnect();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const users = await User.find({ shirtNumber: { $nin: [0, 1] } }).sort({ shirtNumber: 1 });
  
  const matchCheckIns = await CheckIn.find({
    type: 'match',
    createdAt: { $gte: today }
  });

  // FIX: Deduplicate check-ins to prevent React UI glitches
  const uniqueCheckIns = matchCheckIns.filter((record, index, self) =>
    index === self.findIndex((r) => r.playerName === record.playerName)
  );

  const checkedInPlayers = uniqueCheckIns.map(record => {
    const userDoc = users.find(u => u.name === record.playerName);
    
    return {
      name: record.playerName,
      number: userDoc ? userDoc.shirtNumber : 0,
      role: userDoc?.role || "Unassigned",
      mental: record.mentalHealth,
      physical: record.physicalHealth
    };
  });

  return <MatchBoardClient initialPlayers={checkedInPlayers} />;
}