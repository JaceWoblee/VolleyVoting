'use server'

import dbConnect from '@/lib/db';
import Vote from '@/models/Vote';
import User from '@/models/User';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import Message from '@/models/Message';

export async function handleVote(formData: FormData, shirtNumber: number, pin: string) {
  await dbConnect();

  const mentalSupport = formData.get('mentalSupport') as string;
  const bonusTarget = formData.get('bonusTarget') as string;
  const bonusReason = formData.get('bonusReason') as string;

  // 1. Validation
  if (!mentalSupport || !bonusTarget || !bonusReason.trim()) {
    return { error: "Bitte fülle alle Voting-Felder aus!" };
  }

  const user = await User.findOne({ shirtNumber, pin });
  if (!user || user.hasVoted) return { error: "Bereits abgestummen." };

  try {
    // 2. Find the target player to get their shirt number for the Message
    const targetUser = await User.findOne({ name: bonusTarget });
    if (!targetUser) return { error: "Zielspielerin nicht gefunden." };

    // 3. Create the Vote record (For DB history)
    await Vote.create({ 
      shirtNumber, 
      mentalSupport, 
      bonusTarget, 
      bonusReason 
    });

    // 4. Increment Points in the User model (For Scoreboard)
    await User.updateOne({ name: mentalSupport }, { $inc: { votes: 1 } });
    await User.updateOne({ name: bonusTarget }, { $inc: { votes: 1 } });

    // 5. Create the mandatory message for the player (For Inbox)
    await Message.create({
      shirtNumber: targetUser.shirtNumber,
      playerName: "ExtraPunkt", // Title shown in inbox
      text: bonusReason,
      isAnonymous: true,
      forPlayer: true // Ensures it shows in Player Inbox, not Admin
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

  if (user.shirtNumber === 0) {
    const cookieStore = await cookies();
    cookieStore.set('admin_session', 'authenticated', { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 60 * 60 * 2, 
    path: '/' 
  });
    
    return { success: true, isAdmin: true };
  }

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

