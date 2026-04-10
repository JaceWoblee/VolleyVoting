import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Exercise from '@/models/Exercise';
import ExerciseClient from './ExerciseClient'; // We will create this next

export default async function ExercisesPage() {
  const cookieStore = await cookies();
  const playerCookie = cookieStore.get('player_session');
  const adminCookie = cookieStore.get('admin_session');

  // 1. Identify the user
  let currentUser = null;

  if (adminCookie?.value === 'authenticated') {
    currentUser = { name: "Yasha", shirtNumber: 0, isAdmin: true };
  } else if (playerCookie) {
    await dbConnect();
    // Assuming the cookie stores the shirtNumber
    const user = await User.findOne({ shirtNumber: Number(playerCookie.value) });
    if (user) {
      currentUser = { name: user.name, shirtNumber: user.shirtNumber, isAdmin: false };
    }
  }

  // 2. If not logged in, show a login wall
  if (!currentUser) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm text-center border border-slate-200">
          <h1 className="text-xl font-bold text-slate-800">🔒 Zugriff eingeschränkt</h1>
          <p className="text-slate-500 mt-2 mb-6">Du musst eingeloggt sein, um Übungen zu sehen oder vorzuschlagen.</p>
          <a href="/login" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">Zum Login</a>
        </div>
      </main>
    );
  }

  // 3. Fetch data for logged-in users
  await dbConnect();
  const data = await Exercise.find({}).sort({ createdAt: -1 });
  const initialExercises = JSON.parse(JSON.stringify(data));

  return <ExerciseClient currentUser={currentUser} initialExercises={initialExercises} />;
}