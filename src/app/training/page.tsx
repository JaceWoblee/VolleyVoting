import dbConnect from '@/lib/db';
import CheckIn from '@/models/CheckIn';
import User from '@/models/User';
import TrainingBoardClient from './TrainingBoardClient';

export const dynamic = 'force-dynamic';

export default async function TrainingPage() {
  await dbConnect();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const users = await User.find({ shirtNumber: { $nin: [0, 1] } }).sort({ shirtNumber: 1 });

  const trainingCheckIns = await CheckIn.find({
    type: { $ne: 'match' },
    createdAt: { $gte: today },
  });

  // Deduplicate today's check-ins
  const uniqueCheckIns = trainingCheckIns.filter(
    (record, index, self) =>
      index === self.findIndex((r) => r.playerName === record.playerName)
  );

  const checkedInPlayers = uniqueCheckIns.map((record) => {
    const userDoc = users.find((u) => u.name === record.playerName);
    return {
      name: record.playerName,
      number: userDoc ? userDoc.shirtNumber : 0,
      role: userDoc?.role || 'Unassigned',
      mental: record.mentalHealth ?? 5,
      physical: record.physicalHealth ?? 5,
    };
  });

  // Full roster fallback so you can test on days without active check-ins
  const allPlayers = users.map((u) => ({
    name: u.name,
    number: u.shirtNumber,
    role: u.role || 'Unassigned',
    mental: 5,
    physical: 5,
  }));

  return (
    <TrainingBoardClient
      checkedInPlayers={checkedInPlayers}
      allPlayers={allPlayers}
    />
  );
}