export const dynamic = 'force-dynamic';
export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-indigo-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm text-center">
        <div className="text-6xl mb-4">🏐</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Vote gespeichert!</h1>
        <p className="text-slate-600 mb-6">
          Danke für deine Zeit
          <span className="block font-semibold italic mt-2 text-indigo-600">
            
          </span>
        </p>
        <a 
          href="/" 
          className="inline-block text-sm font-bold text-indigo-500 hover:text-indigo-700"
        >
          ← Zurück zum Anfang
        </a>
      </div>
    </main>
  );
}