import dbConnect from "@/lib/db";
import SurveyResponse from "@/models/SurveyResponse";

const questionLabels = [
  "Was hilft dir im Training am meisten? Wovon sollten wir weniger tun?",
  "Ist die Kommunikation an den Matches klar? Wenn nicht, was verwirrt dich?",
  "Welche Übungen magst du am liebsten? Welche gar nicht? \n Bei welchen hast du das Gefühl, dass wir sie zu selten, zu oft oder zu lange machen?",
  "Wenn du die neue Trainerin vom D5 werden würdest, was würdest du als erstes ändern? Was würdest du genau so machen?",
  "Was hat dich diese Saison angetrieben, dein Bestes zu geben, ins Training zu kommen oder dich zu verbessern?",
  "Würdest du die Webseite und das Voting-System nochmals in der nächsten Saison haben wollen? Warum Ja/Nein/Jein?",
  "Anderes Feedback"
];

export default async function SurveyResultsPage() {
  await dbConnect();
  const allResponses = await SurveyResponse.find({}).sort({ createdAt: -1 });

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-10 text-slate-900">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-indigo-900">Saison-Auswertung</h1>
          <p className="text-slate-500 mt-2">Alle Antworten gruppiert nach Fragen</p>
        </header>

        <div className="space-y-12">
          {questionLabels.map((label, index) => {
            const qNum = index + 1;
            const answers = allResponses.filter(r => r.questionNumber === qNum);

            return (
              <section key={qNum} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-indigo-600 p-4">
                  <h2 className="text-white font-bold text-lg">
                    {qNum}. {label}
                  </h2>
                </div>
                
                <div className="p-4 space-y-4">
                  {answers.length > 0 ? (
                    answers.map((resp, i) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-xl border-l-4 border-indigo-400 text-sm leading-relaxed whitespace-pre-wrap">
                        {resp.answer}
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic text-sm">Noch keine Antworten zu dieser Frage.</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}