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
  
  const initialPlayers = users.map(u => ({
    name: u.name,
    number: u.shirtNumber,
    role: u.role || 'Unassigned', 
    mental: 5,
    physical: 5
  }));

  const matchCheckIns = await CheckIn.find({
    type: 'match',
    createdAt: { $gte: today }
  });

  const checkedInPlayers = matchCheckIns.map(record => {
    // We already find the matching user in the database right here
    const userDoc = users.find(u => u.name === record.playerName);
    
    return {
      name: record.playerName,
      number: userDoc ? userDoc.shirtNumber : 0,
      role: userDoc?.role || "Unassigned", // <-- Now dynamically using the DB role
      mental: record.mentalHealth,
      physical: record.physicalHealth
    };
  });

  return <MatchBoardClient initialPlayers={checkedInPlayers} />;
}