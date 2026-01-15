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
  if (!user) return { error: "Invalid Login." };
  if (user.hasVoted) return { error: "Already voted!" };

  try {
    await Vote.create({
      shirtNumber: user.shirtNumber, // Match your Vote.ts model exactly
      shield: formData.get('shield'),
      spark: formData.get('spark'),
      catalyst: formData.get('catalyst'),
    });

    user.hasVoted = true;
    await user.save();
    revalidatePath('/admin'); // Update the coach's view
  } catch (e: any) {
    console.error("Vote Error:", e);
    return { error: "DB Error: " + e.message }; 
  }

  redirect('/success');
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
  
  if (!user) return { error: "Invalid credentials." };

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
  if (newPin.length < 4) return { error: "PIN must be at least 4 digits." };
  
  const user = await User.findOneAndUpdate(
    { shirtNumber, pin: oldPin },
    { pin: newPin, needsPasswordChange: false },
    { new: true }
  );

  if (!user) return { error: "Could not update PIN." };
  return { success: true };
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
    console.error("Feedback Error:", e);
    return { error: "Failed to save message." };
  }
}