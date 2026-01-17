'use client'
export const dynamic = 'force-dynamic';

import { TEAM_ROSTER } from '@/lib/players';
import { getPlayerMessages, sendFeedback, handleVote, verifyLogin, updatePin } from './actions';
import { useState } from 'react';

export default function VotePage() {
  const [step, setStep] = useState<'login' | 'change-pin' | 'vote'>('login');
  const [shirtNumber, setShirtNumber] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [loggedInName, setLoggedInName] = useState(''); 
  const [feedback, setFeedback] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedShirt = parseInt(shirtNumber);
    
    const res = await verifyLogin(parsedShirt, pin);
    if (res.error) return alert(res.error);

    // Define msgRes here during login
    const msgRes = await getPlayerMessages(parsedShirt);
    
    if (!msgRes.error) {
      // FILTER HERE: Only keep messages where forPlayer is true
      const filtered = msgRes.messages.filter((m: any) => m.forPlayer === true);
      setMessages(filtered); // Save the filtered result to state
    }
    
    if (res.isAdmin) {
      window.location.href = '/admin'; 
      return;
    }

    setLoggedInName(res.userName);
    setStep(res.needsPasswordChange ? 'change-pin' : 'vote');
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    const res = await sendFeedback(parseInt(shirtNumber), loggedInName, feedback, isAnonymous);
    if (!res.error) {
      alert("Nachricht gesendet!");
      setFeedback('');
      setIsAnonymous(false); 
    }
  };

  const filteredRoster = TEAM_ROSTER.filter(name => name !== loggedInName);

  const onChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updatePin(parseInt(shirtNumber), pin, newPin);
    if (res.error) return alert(res.error);
    setPin(newPin); 
    setStep('vote');
  };

  const onVote = async (formData: FormData) => {
    // Validation: Ensure everything is selected before sending to server
    const mental = formData.get('mentalSupport');
    const bonus = formData.get('bonusTarget');
    const reason = formData.get('bonusReason') as string;

    if (!mental || !bonus || !reason.trim()) {
      return alert("Bitte fülle alle Voting-Felder aus!");
    }

    const result = await handleVote(formData, parseInt(shirtNumber), pin);
    if (result?.error) alert(result.error);
  };

  return (
    <main className="min-h-screen bg-slate-100 py-8 px-4 text-slate-900">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* CARD 1: LOGIN / VOTING */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 border border-slate-200">
          <h1 className="text-3xl font-extrabold text-center text-indigo-700 mb-2 tracking-tight">Match Awards</h1>
          
          {step === 'login' && (
            <form onSubmit={onLogin} className="space-y-6 mt-6">
              <div className="space-y-4">
                <input 
                  type="number" placeholder="Shirt Nummer" 
                  className="w-full p-4 rounded-xl border border-slate-200 text-black font-bold"
                  onChange={(e) => setShirtNumber(e.target.value)}
                />
                <input 
                  type="password" placeholder="PIN (Standard 1234)" 
                  className="w-full p-4 rounded-xl border border-slate-200 text-black font-bold"
                  onChange={(e) => setPin(e.target.value)}
                />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">Login</button>
            </form>
          )}

          {step === 'change-pin' && (
            <form onSubmit={onChangePin} className="space-y-6 mt-6">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-sm text-amber-800">
                <strong>Sicherheit:</strong> Bitte ändere deinen PIN.
              </div>
              <input 
                type="password" placeholder="Neuer 4-Stelliger PIN" 
                className="w-full p-4 rounded-xl border border-slate-200 text-black font-bold"
                onChange={(e) => setNewPin(e.target.value)}
              />
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg">Speichern</button>
            </form>
          )}

          {step === 'vote' && (
            <form action={onVote} className="space-y-6 mt-6">
              <div className="text-center text-slate-500 mb-4 font-medium italic">Hallo, {loggedInName}!</div>
              
              <div className="space-y-6">
                {/* VOTE 1: Mental Support */}
                <div>
                  <label className="block text-xs font-bold uppercase text-indigo-600 mb-1">🧠 Mentale Unterstützung</label>
                  <p className="text-[10px] text-slate-500 mb-2">Wer hat dir heute am meisten geholfen?</p>
                  <select name="mentalSupport" required className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-black font-medium">
                    <option value="">Wähle eine Spielerin...</option>
                    {filteredRoster.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>

                {/* VOTE 2: Extra Point + Mandatory Reason */}
                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold uppercase text-amber-600 mb-1">⭐ Extra Punkt & Nachricht</label>
                  <select name="bonusTarget" required className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-black font-medium mb-3">
                    <option value="">Wer bekommt den Extra-Punkt?</option>
                    {filteredRoster.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                  
                  <textarea 
                    name="bonusReason" 
                    required
                    placeholder="Warum? (Diese Nachricht wird der Spielerin gezeigt)"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-black h-24 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg">Absenden</button>
            </form>
          )}
        </div>

        {/* CARD 2: POSTFACH (Inbox) */}
        {loggedInName && messages.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Postfach 📥</h2>
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg._id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-indigo-600 uppercase">
                      {/* Remove the extra nested <span> that was here */}
                      {msg.isFromCoach ? "Yasha" : msg.playerName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{msg.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CARD 3: FEEDBACK TO TRAINER */}
        {loggedInName && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800">Nachricht an Yasha 📬</h2>
            <form onSubmit={handleSendFeedback} className="space-y-3 mt-4">
              <textarea 
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Deine Nachricht..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-black h-28"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isAnonymous} 
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                />
                <span className="text-xs text-slate-600 font-medium">Anonym senden?</span>
              </label>
              <button type="submit" className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-sm">Senden</button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}