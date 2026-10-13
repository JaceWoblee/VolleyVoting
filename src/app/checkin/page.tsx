import dbConnect from '@/lib/db';
import User from '@/models/User';
import CheckInClient from './CheckInClient';

export const dynamic = 'force-dynamic';

export default async function CheckInPage() {
  await dbConnect();

  // Fetch all active players (excluding dummy admin accounts 0 and 1)
  const users = await User.find({ shirtNumber: { $nin: [0, 1] } }).sort({ name: 1 });

  // Map only the data needed by the Kiosk
  const roster = users.map(u => ({
    name: u.name,
    shirtNumber: u.shirtNumber,
    role: u.role || 'Unassigned',
  }));

  return <CheckInClient roster={roster} />;
}