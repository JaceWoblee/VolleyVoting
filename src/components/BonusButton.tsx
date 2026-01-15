"use client"; // This tells Next.js this button runs in the browser

import { giveCoachBonus } from "@/app/actions";

export default function BonusButton({ shirtNumber, playerName }: { shirtNumber: number, playerName: string }) {
  return (
    <button 
      onClick={async () => {
        const reason = prompt(`Why does ${playerName} get an extra point?`);
        if (reason) {
          await giveCoachBonus(shirtNumber, reason);
          alert("Point and message sent!");
        }
      }}
      className="ml-4 bg-yellow-400 text-black px-2 py-1 rounded text-[10px] font-bold hover:bg-yellow-500 transition-colors"
    >
      +1 Bonus
    </button>
  );
}