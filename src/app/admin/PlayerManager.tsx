'use client';

import { useState } from 'react';
import { createPlayer, updatePlayer, deletePlayer, resetPlayerPin } from '../actions';
import BonusButton from '@/components/BonusButton';

const ROLES = ['Pass', 'Neben', 'Mitte', 'Dia', 'Libera', 'Unassigned'];

export default function PlayerManager({ users }: { users: any[] }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [shirtNumber, setShirtNumber] = useState<number | ''>('');
  const [role, setRole] = useState('Unassigned');
  const [customPin, setCustomPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAddModal = () => {
    setName('');
    setShirtNumber('');
    setRole('Unassigned');
    setCustomPin('');
    setIsAddOpen(true);
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setName(u.name);
    setShirtNumber(u.shirtNumber);
    setRole(u.role || 'Unassigned');
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || shirtNumber === '') return;
    setIsSubmitting(true);

    const res = await createPlayer({
      name,
      shirtNumber: Number(shirtNumber),
      role,
      pin: customPin
    });

    if (res?.error) {
      alert(res.error);
    } else {
      setIsAddOpen(false);
    }
    setIsSubmitting(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !name || shirtNumber === '') return;
    setIsSubmitting(true);

    const res = await updatePlayer(editingUser.shirtNumber, {
      name,
      shirtNumber: Number(shirtNumber),
      role
    });

    if (res?.error) {
      alert(res.error);
    } else {
      setEditingUser(null);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (user: any) => {
    if (!confirm(`Möchtest du #${user.shirtNumber} ${user.name} wirklich komplett löschen?`)) return;
    const res = await deletePlayer(user.shirtNumber);
    if (res?.error) alert(res.error);
  };

  const handleResetPin = async (user: any) => {
    if (!confirm(`PIN für #${user.shirtNumber} ${user.name} zurücksetzen?`)) return;
    await resetPlayerPin(user.shirtNumber);
    alert(`PIN für #${user.shirtNumber} ${user.name} wurde zurückgesetzt.`);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>👤</span> Player Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{users.length} Spielerinnen registriert</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-sm transition-colors flex items-center gap-1"
        >
          <span>+</span> Neue Spielerin
        </button>
      </div>

      {/* Roster Table / List */}
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 pr-1">
        {users.map((user) => (
          <div key={user.shirtNumber} className="py-2.5 flex items-center justify-between text-sm hover:bg-slate-50 px-2 rounded-lg transition-colors">
            <div className="flex items-center gap-2.5">
              <span className="font-black text-slate-400 w-7 text-left">#{user.shirtNumber}</span>
              <span className="font-bold text-slate-800">{user.name}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {user.role || 'Unassigned'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openEditModal(user)}
                title="Bearbeiten"
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-bold transition-colors"
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={() => handleResetPin(user)}
                title="PIN zurücksetzen"
                className="text-[10px] bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 px-2 py-1 rounded font-bold uppercase transition-colors"
              >
                PIN
              </button>
              <BonusButton shirtNumber={user.shirtNumber} playerName={user.name} />
              <button
                type="button"
                onClick={() => handleDelete(user)}
                title="Spielerin löschen"
                className="text-xs bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-700 px-2 py-1 rounded transition-colors"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ADD PLAYER MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Neue Spielerin hinzufügen</h3>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                <input
                  required
                  type="text"
                  placeholder="z.B. Lena"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trikotnummer</label>
                <input
                  required
                  type="number"
                  placeholder="z.B. 14"
                  value={shirtNumber}
                  onChange={e => setShirtNumber(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Position / Rolle</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 bg-white"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Initialer PIN (optional)</label>
                <input
                  type="text"
                  placeholder="Standard: 4-stellig mit Nullen"
                  value={customPin}
                  onChange={e => setCustomPin(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg font-bold text-xs"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold text-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Speichert...' : 'Hinzufügen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PLAYER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Spielerin bearbeiten</h3>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trikotnummer</label>
                <input
                  required
                  type="number"
                  value={shirtNumber}
                  onChange={e => setShirtNumber(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Position / Rolle</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 bg-white"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg font-bold text-xs"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold text-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Speichert...' : 'Aktualisieren'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}