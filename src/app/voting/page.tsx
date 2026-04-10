import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import VotingClient from './VotingClient';

export default async function VotingPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('player_session');

  // If no cookie, kick them to login
  if (!session) redirect('/');

  await dbConnect();
  const user = await User.findOne({ shirtNumber: Number(session.value) });

  if (!user) redirect('/');
  
  // If they somehow guessed the URL but already voted, kick them back to home
  if (user.hasVoted) redirect('/home');

  return <VotingClient userName={user.name} />;
}