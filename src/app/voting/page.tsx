import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import VotingClient from './VotingClient';

export const dynamic = 'force-dynamic';

export default async function VotingPage() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get('player_session')?.value || 'Unknown';
  const decodedSession = decodeURIComponent(sessionValue).trim();
  
  await dbConnect();
  
  const users = await User.find({ shirtNumber: { $nin: [0, 1] } }).sort({ name: 1 });
  
  // Convert the cookie string into a number just in case the player logged in with their shirt number
  const possibleNumber = parseInt(decodedSession, 10);
  
  // Find the user by checking BOTH their name and their shirt number
  const loggedInUser = users.find(u => 
    u.name.trim().toLowerCase() === decodedSession.toLowerCase() || 
    u.shirtNumber === possibleNumber
  );
  
  // If found, grab their actual shirt number and real name
  const userNumber = loggedInUser ? loggedInUser.shirtNumber : -1;
  const displayGreetingName = loggedInUser ? loggedInUser.name : decodedSession;

  const roster = users.map(u => ({
    name: u.name,
    number: u.shirtNumber
  }));

  return <VotingClient userName={displayGreetingName} userNumber={userNumber} roster={roster} />;
}