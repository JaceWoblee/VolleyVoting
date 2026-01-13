'use client'

import { TEAM_ROSTER } from '@/lib/players';
import { handleVote, verifyLogin, updatePin } from './actions';
import { useState } from 'react';

export default function VotePage() {
  const [step, setStep] = useState<'login' | 'change-pin' | 'vote'>('login');
  const [shirtNumber, setShirtNumber] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [loggedInName, setLoggedInName] = useState(''); // New state

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await verifyLogin(parseInt(shirtNumber), pin);
    if (res.error) return alert(res.error);
    
    setLoggedInName(res.userName); // Store their name
    
    if (res.needsPasswordChange) {
      setStep('change-pin');
    } else {
      setStep('vote');
    }
  };

  // Filter out the logged-in user from the roster
  const filteredRoster = TEAM_ROSTER.filter(name => name !== loggedInName);

  // Step 2: Handle PIN Change
  const onChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updatePin(parseInt(shirtNumber), pin, newPin);
    if (res.error) return alert(res.error);
    
    setPin(newPin); 
    setStep('vote');
  };

  // Step 3: Final Vote
  const onVote = async (formData: FormData) => {
    const result = await handleVote(formData, parseInt(shirtNumber), pin);
    if (result?.error) alert(result.error);
  };

  return (
    <main className="min-h-screen bg-slate-100 py-8 px-4 text-slate-900">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-6 border border-slate-200">
        <h1 className="text-3xl font-extrabold text-center text-indigo-700 mb-2 tracking-tight">Match Awards</h1>
        
        {/* STEP 1: LOGIN */}
        {step === 'login' && (
          <form onSubmit={onLogin} className="space-y-6 mt-6">
            <div className="space-y-4">
              <input 
                type="number" placeholder="Shirt Nummer" 
                className="w-full p-4 rounded-xl border border-slate-200 text-black font-bold"
                onChange={(e) => setShirtNumber(e.target.value)}
              />
              <input 
                type="password" placeholder="PIN (Standart 1234)" 
                className="w-full p-4 rounded-xl border border-slate-200 text-black font-bold"
                onChange={(e) => setPin(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">Login</button>
          </form>
        )}

        {/* STEP 2: CHANGE PIN */}
        {step === 'change-pin' && (
          <form onSubmit={onChangePin} className="space-y-6 mt-6">
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-sm text-amber-800">
              <strong>Zur Sicherheit:</strong> Bitte ändere deinen Pin.
            </div>
            <input 
              type="password" placeholder="Set New 4-Digit PIN" 
              className="w-full p-4 rounded-xl border border-slate-200 text-black font-bold"
              onChange={(e) => setNewPin(e.target.value)}
            />
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg">Speichern</button>
          </form>
        )}

        {/* STEP 3: VOTING */}
        {step === 'vote' && (
          <form action={onVote} className="space-y-6 mt-6">
            <div className="text-center text-slate-500 mb-4 font-medium italic">Hallo, {loggedInName}!</div>
            <div className="space-y-4">
               <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Vote 1</label>
                <select name="shield" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-black font-medium">
                  <option value="">Select a teammate...</option>
                  {filteredRoster.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Vote 2</label>
                <select name="spark" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-black font-medium">
                  <option value="">Select a teammate...</option>
                  {filteredRoster.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Vote 3</label>
                <select name="catalyst" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-black font-medium">
                  <option value="">Select a teammate...</option>
                  {filteredRoster.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg">Submit</button>
          </form>
        )}
      </div>
    </main>
  );
}