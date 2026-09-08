"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CheckInKiosk() {
  const router = useRouter();
  
  const [players, setPlayers] = useState([
    { name: "Laura", image: "/laura.jpg" , color: "#EC4899"},
    { name: "Jeanne", image: "/jeanne.jpg" , color: "#7cec48"},
    { name: "Vera", image: "/vera.jpg" , color: "#48ec9f"},
    { name: "Seraina", image: "/seraina.jpg" , color: "#6648ec"},
    { name: "Anaïs", image: "/anais.jpg" , color: "#ec4848"},
    { name: "Tina", image: "/tina.jpg" , color: "#4c9449"},
    { name: "Eli", image: "/eli.jpg" , color: "#EC4899"},
    { name: "Sofia", image: "/sofia.jpg" , color: "#EC4899"},
    { name: "Ainoa", image: "/ainoa.jpg" , color: "#EC4899"},
    { name: "Eda", image: "/eda.jpg" , color: "#EC4899"},
    { name: "Maria", image: "/maria.jpg" , color: "#EC4899"},
    { name: "Elonie", image: "/elonie.jpg" , color: "#EC4899"},
    { name: "Yarina", image: "/yarina.jpg" , color: "#EC4899"},

    // ... add the rest of your players here
  ]);
  // TypeScript needs to know this can be a string OR null
  const [selectedPlayer, setSelectedPlayer] = useState<{name: string, image: string, color: string} | null>(null);
  const [mental, setMental] = useState<number>(5);
  const [physical, setPhysical] = useState<number>(5);

  const handleVote = async () => {
    if (!selectedPlayer) return;

    await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: selectedPlayer.name, mentalHealth: mental, physicalHealth: physical })
    });

    setPlayers(players.filter(p => p.name !== selectedPlayer.name));
    setSelectedPlayer(null);
    setMental(5);
    setPhysical(5);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8 font-sans">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-black text-white tracking-wider flex items-center gap-4">
          <span className="text-5xl drop-shadow-lg">🏐</span> 
          <span>VB Therwil Check-In</span>
        </h1>
        <button 
          onClick={() => router.push('/checkin/results')} 
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 text-xl rounded-xl transition-colors shadow-[0_0_15px_rgba(37,99,235,0.5)] active:scale-95"
        >
          Coach Results
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {players.map(player => (
          <button 
            key={player.name} 
            onClick={() => setSelectedPlayer(player)}
            style={{ 
              backgroundImage: `url(${player.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderColor: player.color // The 3D bottom border matches their color!
            }}
            className="group relative h-32 overflow-hidden text-white font-black text-3xl rounded-2xl shadow-lg transition-all active:scale-95 border-b-8 flex items-center justify-start px-8"
          >
            {/* The fading color gradient overlay */}
            <div 
              className="absolute inset-0 transition-opacity group-active:opacity-80"
              style={{
                // 'cc' adds 80% opacity, '00' makes it completely transparent on the right
                background: `linear-gradient(to right, ${player.color}cc 30%, ${player.color}00 100%)`
              }}
            ></div>
            
            {/* A very light dark tint so white text is always readable over bright colors */}
            <div className="absolute inset-0 bg-black/10"></div>
            
            {/* The Player Name */}
            <span className="relative z-10 tracking-wide drop-shadow-lg">{player.name}</span>
          </button>
        ))}
      </div>

      {/* The Voting Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all">
          <div className="bg-white p-10 rounded-[2rem] w-[90%] max-w-lg shadow-2xl">
            
            {/* Styled Title */}
            <h2 className="text-4xl font-extrabold text-center text-gray-800 mb-8 tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
                {selectedPlayer.name}'s
              </span> Status
            </h2>
            
            <div className="space-y-8 mb-10">
              {/* Mental Health Section */}
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xl font-bold text-gray-700">🧠 Mental Energy</label>
                  <span className="text-2xl font-black text-blue-700 bg-blue-200 px-4 py-1 rounded-full shadow-sm">
                    {mental}
                  </span>
                </div>
                <input 
                  type="range" min="1" max="10" 
                  value={mental} 
                  onChange={(e) => setMental(Number(e.target.value))} 
                  className="w-full h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                />
                <div className="flex justify-between text-sm text-gray-500 mt-3 font-semibold">
                  <span>Drained (1)</span>
                  <span>Perfect (10)</span>
                </div>
              </div>

              {/* Physical Health Section */}
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xl font-bold text-gray-700">🔋 Physical Body</label>
                  <span className="text-2xl font-black text-emerald-700 bg-emerald-200 px-4 py-1 rounded-full shadow-sm">
                    {physical}
                  </span>
                </div>
                <input 
                  type="range" min="1" max="10" 
                  value={physical} 
                  onChange={(e) => setPhysical(Number(e.target.value))} 
                  className="w-full h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-emerald-600" 
                />
                <div className="flex justify-between text-sm text-gray-500 mt-3 font-semibold">
                  <span>Hurting (1)</span>
                  <span>Fresh (10)</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => {
                  setSelectedPlayer(null); // Closes the modal
                  setMental(5);            // Resets sliders
                  setPhysical(5);
                }} 
                className="w-1/3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-5 text-xl rounded-2xl shadow transition-transform active:scale-95"
              >
                Cancel
              </button>
              
              <button 
                onClick={handleVote} 
                className="w-2/3 bg-gradient-to-r from-gray-900 to-gray-700 hover:from-black hover:to-gray-800 text-white font-bold px-8 py-5 text-2xl rounded-2xl shadow-lg transition-transform active:scale-95"
              >
                Submit Check-In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}