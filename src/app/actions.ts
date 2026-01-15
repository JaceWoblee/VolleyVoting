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

  const user = await User.findOne({ shirtNumber, pin });
  if (!user) return { error: "Ungültiger Login." };
  if (user.hasVoted) return { error: "Bereits Abgestummen!" };

  const shield = formData.get('shield') as string;
  const spark = formData.get('spark') as string;
  const catalyst = formData.get('catalyst') as string;

  try {
    // 1. Create the detailed vote record
    await Vote.create({
      shirtNumber: user.shirtNumber,
      shield,
      spark,
      catalyst,
    });

    // 2. Increment the total vote counter for the three chosen players
    // This connects the vote to the "Pillars Progress" bar
    if (shield) await User.updateOne({ name: shield }, { $inc: { votes: 1 } });
    if (spark) await User.updateOne({ name: spark }, { $inc: { votes: 1 } });
    if (catalyst) await User.updateOne({ name: catalyst }, { $inc: { votes: 1 } });

    // 3. Mark the voter as finished
    user.hasVoted = true;
    await user.save();
    
    revalidatePath('/admin');
    redirect('/success');
  } catch (e: any) {
    console.error("Vote Error:", e);
    return { error: "DB Error: " + e.message }; 
  }
}

export async function syncUserVotes() {
  await dbConnect();
  try {
    const users = await User.find({});
    const allVotes = await Vote.find({});

    for (const user of users) {
      // Calculate how many standard votes this player received
      const standardVotes = allVotes.filter(v => 
        v.shield === user.name || 
        v.spark === user.name || 
        v.catalyst === user.name
      ).length;

      // Note: We don't overwrite Coach bonuses here. 
      // This script should be used carefully if you have many Coach bonuses.
      await User.updateOne(
        { _id: user._id },
        { $set: { votes: standardVotes } }
      );
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (e) {
    return { error: "Sync failed" };
  }
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
    { shirtNumber: 0, name: "Coach", pin: "Yashakimi1", hasVoted: false, needsPasswordChange: false },
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
    await User.updateOne(
      { shirtNumber: targetShirtNumber },
      { $inc: { votes: 1 } }
    );

    await Message.create({
      shirtNumber: targetShirtNumber,
      playerName: "Coach",
      text: reason, // No need for "COACH BONUS" prefix anymore!
      isAnonymous: false,
      isFromCoach: true // Set the flag here
    });

    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true };
  } catch (e) {
    return { error: "Failed to give bonus." };
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
      isAnonymous
    });
    revalidatePath('/admin');
    return { success: true };
  } catch (e) {
    console.error("Feedback Fehler:", e);
    return { error: "Konnte die Nachricht nicht speichern." };
  }
}