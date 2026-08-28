import { Check, CircleAlert, Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import supabase from "../../../lib/supabase";

const emptyQuestion = { concept: "", question: "", correctAnswer: "" };

function PracticeQuestions({ theme, studyId, userId, topic }) {
  const [questions, setQuestions] = useState([]);
  const [draft, setDraft] = useState(emptyQuestion);
  const [answer, setAnswer] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!studyId) return;
    const loadQuestions = async () => {
      const { data, error: fetchError } = await supabase
        .from("study_session_logs")
        .select("id, concept, question, correct_answer, outcome, is_correct, created_at")
        .eq("session_id", studyId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (fetchError) setError(fetchError.message);
      else setQuestions(data || []);
      setIsLoading(false);
    };
    loadQuestions();
  }, [studyId]);

  const addQuestion = (event) => {
    event.preventDefault();
    if (!draft.concept.trim() || !draft.question.trim() || !draft.correctAnswer.trim()) return;
    setQuestions((current) => [{
      id: `draft-${Date.now()}`,
      concept: draft.concept.trim(),
      question: draft.question.trim(),
      correct_answer: draft.correctAnswer.trim(),
      outcome: null,
      is_correct: null,
    }, ...current]);
    setDraft(emptyQuestion);
    setIsAdding(false);
    setError("");
  };

  const recordOutcome = async (question, isCorrect) => {
    if (!userId || !studyId || savingId) return;
    setSavingId(question.id);
    setError("");
    const submittedAnswer = (answer[question.id] || "").trim();
    const { data, error: insertError } = await supabase
      .from("study_session_logs")
      .insert({
        session_id: studyId,
        user_id: userId,
        topic: topic || "",
        concept: question.concept,
        question: question.question,
        submitted_answer: submittedAnswer,
        correct_answer: question.correct_answer,
        is_correct: isCorrect,
        outcome: isCorrect ? "correct" : "missed",
        answered_at: new Date().toISOString(),
      })
      .select("id, concept, question, correct_answer, outcome, is_correct, created_at")
      .single();

    if (insertError) setError(insertError.message);
    else setQuestions((current) => current.map((item) => item.id === question.id ? data : item));
    setSavingId(null);
  };

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Practice Questions</h3>
          <p className="mt-1 text-sm text-gray-500">Record what you know so your dashboard can find concepts to revisit.</p>
        </div>
        <button title="Add practice question" onClick={() => setIsAdding((current) => !current)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white ${theme?.accentButton || "bg-green-600"}`}>
          {isAdding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isAdding ? "Cancel" : "Add question"}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={addQuestion} className="mb-5 grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <input value={draft.concept} onChange={(event) => setDraft({ ...draft, concept: event.target.value })} placeholder="Concept" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" required />
          <textarea value={draft.question} onChange={(event) => setDraft({ ...draft, question: event.target.value })} placeholder="Original Socratic question" className="min-h-20 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" required />
          <input value={draft.correctAnswer} onChange={(event) => setDraft({ ...draft, correctAnswer: event.target.value })} placeholder="Expected answer" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" required />
          <button type="submit" className="inline-flex w-fit items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Add to practice</button>
        </form>
      )}

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Unable to save practice result: {error}</p>}
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-gray-500" /> : questions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-500">No practice questions have been added for this session.</div>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <div key={question.id} className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{question.concept}</p>
              <p className="mt-2 font-medium text-gray-900">{question.question}</p>
              {question.outcome ? (
                <p className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold ${question.is_correct ? "text-green-700" : "text-red-700"}`}>
                  {question.is_correct ? <Check className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                  {question.is_correct ? "Correct" : "Needs another attempt"}
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  <input value={answer[question.id] || ""} onChange={(event) => setAnswer({ ...answer, [question.id]: event.target.value })} placeholder="Your answer" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  <div className="flex flex-wrap gap-2">
                    <button disabled={savingId === question.id} onClick={() => recordOutcome(question, true)} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" /> Mark correct</button>
                    <button disabled={savingId === question.id} onClick={() => recordOutcome(question, false)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"><CircleAlert className="h-4 w-4" /> Mark missed</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PracticeQuestions;
