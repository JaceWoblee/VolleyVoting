'use client'
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { verifyLogin, updatePin } from './actions';

export default function LoginPage() {
  const [step, setStep] = useState<'login' | 'change-pin'>('login');
  const [shirtNumber, setShirtNumber] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await verifyLogin(parseInt(shirtNumber), pin);
    
    if (res.error) return alert(res.error);

    if (res.isAdmin) {
      window.location.href = '/admin'; 
      return;
    }

    if (res.needsPasswordChange) {
      setStep('change-pin');
    } else {
      window.location.href = '/home'; // Redirect to new Home Hub
    }
  };

  const onChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updatePin(parseInt(shirtNumber), pin, newPin);
    if (res.error) return alert(res.error);
    
    window.location.href = '/home'; // Redirect to new Home Hub after pin change
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200 w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-center text-indigo-700 mb-6 tracking-tight">D5 Team Area</h1>
        
        {step === 'login' && (
          <form onSubmit={onLogin} className="space-y-6">
            <input 
              type="number" placeholder="Shirt Nummer" required
              className="w-full p-4 rounded-xl border border-slate-200 text-black font-bold outline-none focus:border-indigo-500"
              onChange={(e) => setShirtNumber(e.target.value)}
            />
            <input 
              type="password" placeholder="PIN" required
              className="w-full p-4 rounded-xl border border-slate-200 text-black font-bold outline-none focus:border-indigo-500"
              onChange={(e) => setPin(e.target.value)}
            />
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
              Einloggen
            </button>
          </form>
        )}

        {step === 'change-pin' && (
          <form onSubmit={onChangePin} className="space-y-6">
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-sm text-amber-800">
              <strong>Sicherheit:</strong> Bitte ändere deinen PIN.
            </div>
            <input 
              type="password" placeholder="Neuer 4-Stelliger PIN" required
              className="w-full p-4 rounded-xl border border-slate-200 text-black font-bold outline-none focus:border-amber-500"
              onChange={(e) => setNewPin(e.target.value)}
            />
            <button type="submit" className="w-full bg-amber-500 text-white py-4 rounded-xl font-bold hover:bg-amber-600 transition-colors">
              PIN Speichern & Weiter
            </button>
          </form>
        )}
      </div>
    </main>
  );
}