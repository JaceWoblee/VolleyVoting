'use server'

import dbConnect from '@/lib/db';
import Vote from '@/models/Vote';
import User from '@/models/User';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import Message from '@/models/Message';
import Exercise from "@/models/Exercise"; 
import SurveyResponse from "@/models/SurveyResponse";

export async function handleVote(formData: FormData) {
  // 1. Read the cookie to find out who is voting
  const cookieStore = await cookies();
  const session = cookieStore.get('player_session');
  
  if (!session) return { error: "Nicht eingeloggt. Bitte neu laden." };
  const shirtNumber = Number(session.value); // We get the ID securely from the cookie!

  await dbConnect();

  const mentalSupport = formData.get('mentalSupport') as string;
  const bonusTarget = formData.get('bonusTarget') as string;
  const bonusReason = formData.get('bonusReason') as string;

  if (!mentalSupport || !bonusTarget || !bonusReason.trim()) {
    return { error: "Bitte fülle alle Voting-Felder aus!" };
  }

  // 2. We no longer check the PIN here, because the cookie proves they are logged in!
  const user = await User.findOne({ shirtNumber });
  if (!user || user.hasVoted) return { error: "Bereits abgestimmt." };

  try {
    const targetUser = await User.findOne({ name: bonusTarget });
    if (!targetUser) return { error: "Zielspielerin nicht gefunden." };

    await Vote.create({ shirtNumber, mentalSupport, bonusTarget, bonusReason });

    await User.updateOne({ name: mentalSupport }, { $inc: { votes: 1 } });
    await User.updateOne({ name: bonusTarget }, { $inc: { votes: 1 } });

    await Message.create({
      shirtNumber: targetUser.shirtNumber,
      playerName: "ExtraPunkt", 
      text: bonusReason,
      isAnonymous: true,
      forPlayer: true 
    });

    user.hasVoted = true;
    await user.save();
    revalidatePath('/admin');
  } catch (e: any) {
    return { error: "Fehler: " + e.message };
  }
  redirect('/success');
}

export async function syncUserVotes() {
  await dbConnect();
  
  const allVotes = await Vote.find({});
  const allUsers = await User.find({});

  for (const user of allUsers) {
    // We count every time the user's name appears in either category
    const count = allVotes.filter(v => {
      // Check mentalSupport and bonusTarget
      return v.mentalSupport === user.name || v.bonusTarget === user.name;
    }).length;

    // Update the User document with the new total
    await User.updateOne(
      { _id: user._id }, 
      { $set: { votes: count } }
    );
  }

  // Force Next.js to throw away the old dashboard data
  revalidatePath('/admin');
  return { success: true };
}

export async function startNewMatch() {
  await dbConnect();
  
  // Reset everyone's voting status
  await User.updateMany({}, { hasVoted: false });
  
  // This tells Next.js to refresh the Admin page data
  revalidatePath('/admin');
}

export async function seedTeam() {
  await dbConnect();
  
  const players = [
    { shirtNumber: 0, name: "Yasha", pin: "Yashakimi1", hasVoted: false, needsPasswordChange: false },
    { shirtNumber: 1, name: "Test Dummy", pin: "1234", hasVoted: false, needsPasswordChange: true },
    { shirtNumber: 3, name: "Eda", pin: "1234", hasVoted: false, needsPasswordChange: true },
    { shirtNumber: 7, name: "Elonie", pin: "1234", hasVoted: false, needsPasswordChange: true },
    { shirtNumber: 9, name: "Yarina", pin: "1234", hasVoted: false, needsPasswordChange: true },
    { shirtNumber: 10, name: "Seraina", pin: "1234", hasVoted: false, needsPasswordChange: true },
    { shirtNumber: 11, name: "Ainoa", pin: "1234", hasVoted: false, needsPasswordChange: true },
    { shirtNumber: 14, name: "Jeanne", pin: "1234", hasVoted: false, needsPasswordChange: true },
    { shirtNumber: 15, name: "Jaël", pin: "1234", hasVoted: false, needsPasswordChange: true },
    { shirtNumber: 18, name: "Theresa", pin: "1234", hasVoted: false, needsPasswordChange: true },
    { shirtNumber: 21, name: "Vera", pin: "1234", hasVoted: false, needsPasswordChange: true },
    { shirtNumber: 22, name: "Sofia", pin: "1234", hasVoted: false, needsPasswordChange: true },
    { shirtNumber: 23, name: "Emily", pin: "1234", hasVoted: false, needsPasswordChange: true },
    { shirtNumber: 24, name: "Ela", pin: "1234", hasVoted: false, needsPasswordChange: true },
  ];

  try {
    await User.deleteMany({}); 
    await User.insertMany(players);
    revalidatePath('/admin');
    return { success: true }; // Added return for safety
  } catch (e) {
    console.error("Seed Error:", e);
    return { error: "Seed failed" };
  }
}

export async function verifyLogin(shirtNumber: number, pin: string) {
  await dbConnect();
  const user = await User.findOne({ shirtNumber, pin });
  
  if (!user) return { error: "Ungültige Eingabe." };

  const cookieStore = await cookies();

  // Admin Login
  if (user.shirtNumber === 0) {
    cookieStore.set('admin_session', 'authenticated', { 
      httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 2, path: '/' 
    });
    return { success: true, isAdmin: true };
  }

  // NEW: Player Login - We save their shirt number in the cookie
  cookieStore.set('player_session', user.shirtNumber.toString(), { 
    httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7, path: '/' 
  });

  return { 
    success: true, 
    isAdmin: false,
    userName: user.name,
    needsPasswordChange: user.needsPasswordChange 
  };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  cookieStore.delete('player_session'); // Ensure player is logged out too
  redirect('/');
}

export async function resetPlayerPin(shirtNumber: number) {
  await dbConnect();
  await User.findOneAndUpdate(
    { shirtNumber }, 
    { pin: "1234", needsPasswordChange: true }
  );
  revalidatePath('/admin');
}

export async function updatePin(shirtNumber: number, oldPin: string, newPin: string) {
  await dbConnect();
  if (newPin.length < 4) return { error: "PIN muss mindestens 4 Zeichen beinhalten." };
  
  const user = await User.findOneAndUpdate(
    { shirtNumber, pin: oldPin },
    { pin: newPin, needsPasswordChange: false },
    { new: true }
  );

  if (!user) return { error: "Konnte den PIN nicht updaten." };
  return { success: true };
}

export async function giveCoachBonus(targetShirtNumber: number, reason: string) {
  await dbConnect();
  try {
    // 1. Find the target player's name
    const targetUser = await User.findOne({ shirtNumber: targetShirtNumber });
    if (!targetUser) return { error: "Spielerin nicht gefunden." };

    // 2. Create a "Fake" Vote entry so the Scoreboard and Sync see it
    // We put the name in bonusTarget so it counts as 1 point
    await Vote.create({
      shirtNumber: 0, // 0 represents the Coach/Admin
      mentalSupport: "Anzahl bonus Votes", // Placeholder for the first category
      bonusTarget: targetUser.name, 
      bonusReason: reason,
    });

    // 3. Update the User's point counter immediately
    await User.updateOne(
      { shirtNumber: targetShirtNumber },
      { $inc: { votes: 1 } }
    );

    // 4. Create the message for the player's inbox
    await Message.create({
      shirtNumber: targetShirtNumber,
      playerName: "Yasha",
      text: reason,
      isAnonymous: false,
      forPlayer: true
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (e) {
    return { error: "Bonus konnte nicht vergeben werden." };
  }
}

export async function getPlayerMessages(shirtNumber: number) {
  await dbConnect(); //
  try {
    // We only want messages sent TO this player
    const messages = await Message.find({ shirtNumber }).sort({ createdAt: -1 }).lean();
    return { messages: JSON.parse(JSON.stringify(messages)) };
  } catch (e) {
    return { error: "Failed to load messages" };
  }
}

// src/app/actions.ts
export async function sendFeedback(
  shirtNumber: number, 
  playerName: string, 
  text: string, 
  isAnonymous: boolean
){
  await dbConnect();
  try {
    await Message.create({ 
      shirtNumber, 
      playerName, 
      text, 
      isAnonymous,
      forPlayer: false 
    });
    revalidatePath('/admin');
    return { success: true };
  } catch (e) {
    console.error("Feedback Fehler:", e);
    return { error: "Konnte die Nachricht nicht speichern." };
  }
}

export async function createExercise(formData: any, player: any) {
  try {
    await dbConnect();
    await Exercise.create({
      title: formData.title || "Unbenannte Übung", // Fallback if they leave title empty
      description: formData.description || "",
      videoLink: formData.videoLink || "",
      createdBy: player.shirtNumber,
      playerName: player.name
    });
    revalidatePath('/exercises');
    return { success: true };
  } catch (e) {
    return { error: "Fehler beim Speichern." };
  }
}

export async function deleteExercise(id: string, shirtNumber: number) {
  await dbConnect();
  // Security check: only delete if the shirtNumber matches the creator
  await Exercise.findOneAndDelete({ _id: id, createdBy: shirtNumber });
  revalidatePath('/exercises');
}

export async function submitSurvey(answers: string[]) {
  await dbConnect();
  try {
    // We create a database entry for every non-empty answer
    const promises = answers.map((text, index) => {
      if (!text.trim()) return null; // Skip if optional question 7 is empty
      return SurveyResponse.create({
        questionNumber: index + 1,
        answer: text.trim()
      });
    });

    await Promise.all(promises.filter(p => p !== null));
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Fehler beim Speichern der Umfrage." };
  }
}

export async function getExercises() {
  await dbConnect();
  // We convert it to a plain object so Next.js doesn't complain
  const data = await Exercise.find({}).sort({ createdAt: -1 });
  return JSON.parse(JSON.stringify(data));
}