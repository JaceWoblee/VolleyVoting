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
  const [isSending, setIsSending] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // CS Tip: Always validate input before sending it to the server
    const parsedShirt = parseInt(shirtNumber);
    
    if (isNaN(parsedShirt)) {
      return alert("Bitte eine gültige Nummer eingeben.");
    }

    const res = await verifyLogin(parsedShirt, pin);

    const msgRes = await getPlayerMessages(parsedShirt);
    if (!msgRes.error) {
      setMessages(msgRes.messages);
    }
    
    if (res.error) return alert(res.error);
    
    if (res.isAdmin) {
      // This is the key change: No more "?p=" in the URL!
      // The cookie you just implemented handles the security.
      window.location.href = '/admin'; 
      return;
    }

    setLoggedInName(res.userName);
    if (res.needsPasswordChange) {
      setStep('change-pin');
    } else {
      setStep('vote');
    }
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    const parsedShirt = parseInt(shirtNumber);
    
    // order: shirtNumber, playerName, text, isAnonymous
    const res = await sendFeedback(parsedShirt, loggedInName, feedback, isAnonymous);
    
    if (!res.error) {
      alert("Message sent!");
      setFeedback('');
      setIsAnonymous(false); 
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
      {/* Container to stack the two separate cards */}
      <div className="max-w-md mx-auto space-y-6">
        
        {/* CARD 1: Voting / Login / PIN Change */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 border border-slate-200">
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
                    <option value="">Wähle eine Spielerin...</option>
                    {filteredRoster.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Vote 2</label>
                  <select name="spark" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-black font-medium">
                    <option value="">Wähle eine Spielerin...</option>
                    {filteredRoster.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Vote 3</label>
                  <select name="catalyst" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-black font-medium">
                    <option value="">Wähle eine Spielerin...</option>
                    {filteredRoster.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg">Submit</button>
            </form>
          )}
        </div>

        {/* CARD 2: MESSAGES FROM COACH */}
          {loggedInName && messages.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Postfach 📥</h2>
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div 
                    key={msg._id} 
                    className="p-4 mb-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-indigo-600 uppercase">
                        {/* If it's from coach, show "Yasha". Otherwise, show the sender logic. */}
                        <span className="text-xs font-bold text-indigo-600 uppercase">Yasha</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {msg.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* CARD 3: OPTIONAL FEEDBACK (Now wrapped in login check and separate container) */}
        {loggedInName && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-lg font-bold text-slate-800">Nachricht an den Trainer 📬</h2>
            <p className="text-xs text-slate-500 mb-4 italic">Feedback zum Spiel oder Training?</p>
            
            <form onSubmit={handleSendFeedback} className="space-y-3">
              <textarea 
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Deine Nachricht..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-black h-28 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={isAnonymous} 
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-600 font-medium group-hover:text-slate-900 transition-colors">
                  Anonym senden?
                </span>
              </label>

              <button type="submit" className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-sm hover:bg-black transition-colors">
                Nachricht senden
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}