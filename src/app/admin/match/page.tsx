import dbConnect from '@/lib/db';
import CheckIn from '@/models/CheckIn';
import User from '@/models/User';
import MatchBoardClient from './MatchBoardClient';

export const dynamic = 'force-dynamic';

export default async function MatchPage() {
  await dbConnect();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const users = await User.find({ shirtNumber: { $nin: [0, 1] } });

  const matchCheckIns = await CheckIn.find({
    type: 'match',
    createdAt: { $gte: today }
  });

  const checkedInPlayers = matchCheckIns.map(record => {
    const userDoc = users.find(u => u.name === record.playerName);
    
    const roleMap: Record<string, string> = {
      "Jeanne": "Pass", "Laura": "Pass",
      "Yarina": "Libera", "Elonie": "Libera",
      "Ainoa": "Neben", "Maria": "Neben", "Eda": "Neben", "Sofia": "Neben",
      "Vera": "Dia", "Seraina": "Dia",
      "Anaïs": "Mitte", "Tina": "Mitte", "Eli": "Mitte"
    };

    return {
      name: record.playerName,
      number: userDoc ? userDoc.shirtNumber : 0,
      role: roleMap[record.playerName] || "Neben",
      mental: record.mentalHealth,
      physical: record.physicalHealth
    };
  });

  return <MatchBoardClient initialPlayers={checkedInPlayers} />;
}