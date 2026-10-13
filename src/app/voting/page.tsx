import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import VotingClient from './VotingClient';

export const dynamic = 'force-dynamic';

export default async function VotingPage() {
  const cookieStore = await cookies();
  // Keep whatever cookie logic you already have here:
  const userName = cookieStore.get('player_session')?.value || 'Unknown'; // (Your existing cookie name)

  // Fetch the live roster from MongoDB
  await dbConnect();
  const users = await User.find({ shirtNumber: { $nin: [0, 1] } }).sort({ name: 1 });
  const roster = users.map(u => u.name);

  // Pass the new roster prop
  return <VotingClient userName={userName} roster={roster} />;
}