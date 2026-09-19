import { Check, CircleAlert, HelpCircle, Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import supabase from "../../../lib/supabase";
import { useAITutor } from "../../../app/AITutorContext";

const emptyQuizDraft = {
  title: "",
  question: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctIndex: 0,
  explanation: "",
};

function PracticeQuestions({ theme, studyId, userId, topic, onTimelineEvent }) {
  const { setQuizInProgress, sendTutorEvent } = useAITutor();
  const [quizzes, setQuizzes] = useState([]);
  const [draft, setDraft] = useState(emptyQuizDraft);
  const [, setUserAnswers] = useState({});
  const [attempts, setAttempts] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  const loadQuizzes = async () => {
    if (!studyId) return;
    setIsLoading(true);
    try {
      const { data: quizData, error: quizError } = await supabase
        .from("session_quizzes")
        .select(`
          id, session_id, user_id, title, source, created_at,
          questions:session_quiz_questions(id, quiz_id, position, question, options, correct_index, explanation)
        `)
        .eq("session_id", studyId)
        .order("created_at", { ascending: false });

      if (quizError) {
        setError(quizError.message);
      } else {
        setQuizzes(quizData || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load quizzes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (studyId) {
      loadQuizzes();
    }
  }, [studyId]);

  const createQuizWithQuestion = async (event) => {
    event.preventDefault();
    if (!studyId) {
      setError("Active study session required to create practice quizzes.");
      return;
    }
    if (!draft.title.trim() || !draft.question.trim() || !draft.optionA.trim() || !draft.optionB.trim()) {
      setError("Please provide a quiz title, question, and at least two options.");
      return;
    }

    setIsLoading(true);
    setError("");

    let activeUserId = userId;
    if (!activeUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      activeUserId = user?.id;
    }

    if (!activeUserId) {
      setError("User session invalid.");
      setIsLoading(false);
      return;
    }

    // 1. Insert session_quizzes row
    const { data: quiz, error: quizErr } = await supabase
      .from("session_quizzes")
      .insert({
        session_id: studyId,
        user_id: activeUserId,
        title: draft.title.trim(),
        source: "user",
      })
      .select("id, title")
      .single();

    if (quizErr || !quiz) {
      setError(`Failed to create quiz: ${quizErr?.message}`);
      setIsLoading(false);
      return;
    }

    // 2. Insert session_quiz_questions row
    const optionsArray = [draft.optionA.trim(), draft.optionB.trim()];
    if (draft.optionC.trim()) optionsArray.push(draft.optionC.trim());
    if (draft.optionD.trim()) optionsArray.push(draft.optionD.trim());

    const { error: questionErr } = await supabase
      .from("session_quiz_questions")
      .insert({
        quiz_id: quiz.id,
        user_id: activeUserId,
        position: 1,
        question: draft.question.trim(),
        options: optionsArray,
        correct_index: Number(draft.correctIndex),
        explanation: draft.explanation.trim() || null,
      });

    if (questionErr) {
      // Compensate: delete orphaned quiz
      await supabase.from("session_quizzes").delete().eq("id", quiz.id);
      setError(`Failed to create quiz question: ${questionErr.message}`);
      setIsLoading(false);
      return;
    }

    // Legacy analytics log write
    await supabase.from("study_session_logs").insert({
      session_id: studyId,
      user_id: activeUserId,
      topic: topic || "",
      concept: draft.title.trim(),
      question: draft.question.trim(),
      submitted_answer: "",
      correct_answer: optionsArray[Number(draft.correctIndex)],
      is_correct: false,
      outcome: "created",
      answered_at: new Date().toISOString(),
    }).catch(() => {});

    if (onTimelineEvent) {
      onTimelineEvent({
        id: crypto.randomUUID(),
        type: "quiz",
        refId: String(quiz.id),
        title: `Quiz created: ${quiz.title}`,
        timestamp: new Date().toISOString(),
      });
    }

    setDraft(emptyQuizDraft);
    setIsAdding(false);
    await loadQuizzes();
  };

  const recordQuizAttempt = async (quiz, selectedIndex) => {
    if (!userId || !studyId || savingId) return;
    setSavingId(quiz.id);
    setError("");

    const questionsList = quiz.questions || [];
    const firstQuestion = questionsList[0];
    if (!firstQuestion) {
      setError("No questions found in this quiz.");
      setSavingId(null);
      return;
    }

    const isCorrect = selectedIndex === firstQuestion.correct_index;
    const score = isCorrect ? 1 : 0;
    const total = 1;
    const answersPayload = [
      {
        question_id: firstQuestion.id,
        selected_index: selectedIndex,
        correct: isCorrect,
      },
    ];

    let activeUserId = userId;
    if (!activeUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      activeUserId = user?.id;
    }

    const { data: attempt, error: attemptErr } = await supabase
      .from("session_quiz_attempts")
      .insert({
        quiz_id: quiz.id,
        user_id: activeUserId,
        score,
        total,
        answers: answersPayload,
      })
      .select()
      .single();

    if (attemptErr) {
      setError(`Failed to save attempt: ${attemptErr.message}`);
    } else {
      setAttempts((prev) => ({
        ...prev,
        [quiz.id]: { isCorrect, score, total, selectedIndex },
      }));

      setQuizInProgress(null);

      if (onTimelineEvent && attempt) {
        onTimelineEvent({
          id: crypto.randomUUID(),
          type: "quiz",
          refId: String(quiz.id),
          title: `Quiz attempted: ${quiz.title} (${isCorrect ? "Correct" : "Incorrect"})`,
          timestamp: new Date().toISOString(),
        });
      }

      // Fire quiz_finished event
      sendTutorEvent("quiz_finished", {
        quiz_id: quiz.id,
        score,
        total,
      });
    }
    setSavingId(null);
  };

  return (
    <div className="mb-8 space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Practice Quizzes</h3>
          <p className="mt-1 text-xs text-slate-500">Test your knowledge with session-scoped quizzes and track your attempts.</p>
        </div>
        <button
          title="Add practice quiz"
          disabled={!studyId}
          onClick={() => setIsAdding((current) => !current)}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 ${theme?.accentButton || "bg-purple-600 hover:bg-purple-700"}`}
        >
          {isAdding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isAdding ? "Cancel" : "Create quiz"}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={createQuizWithQuestion} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-sm">
          <h4 className="font-bold text-slate-900">Create New Session Quiz</h4>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Quiz Title / Topic (e.g., Cellular Respiration)"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-200"
            required
            disabled={!studyId}
          />
          <textarea
            value={draft.question}
            onChange={(e) => setDraft({ ...draft, question: e.target.value })}
            placeholder="Question"
            className="min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-200"
            required
            disabled={!studyId}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={draft.optionA}
              onChange={(e) => setDraft({ ...draft, optionA: e.target.value })}
              placeholder="Option A (required)"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
              required
              disabled={!studyId}
            />
            <input
              value={draft.optionB}
              onChange={(e) => setDraft({ ...draft, optionB: e.target.value })}
              placeholder="Option B (required)"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
              required
              disabled={!studyId}
            />
            <input
              value={draft.optionC}
              onChange={(e) => setDraft({ ...draft, optionC: e.target.value })}
              placeholder="Option C (optional)"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
              disabled={!studyId}
            />
            <input
              value={draft.optionD}
              onChange={(e) => setDraft({ ...draft, optionD: e.target.value })}
              placeholder="Option D (optional)"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
              disabled={!studyId}
            />
          </div>

          <label className="block text-xs font-bold text-slate-700">
            Correct Option
            <select
              value={draft.correctIndex}
              onChange={(e) => setDraft({ ...draft, correctIndex: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              disabled={!studyId}
            >
              <option value={0}>Option A</option>
              <option value={1}>Option B</option>
              {draft.optionC.trim() && <option value={2}>Option C</option>}
              {draft.optionD.trim() && <option value={3}>Option D</option>}
            </select>
          </label>

          <input
            value={draft.explanation}
            onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
            placeholder="Explanation for correct answer (optional)"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            disabled={!studyId}
          />

          <button
            type="submit"
            disabled={!studyId}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Save Practice Quiz
          </button>
        </form>
      )}

      {error && <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      ) : quizzes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          <HelpCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium">No practice quizzes saved for this session.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quizzes.map((quiz) => {
            const question = quiz.questions?.[0];
            const attempt = attempts[quiz.id];

            return (
              <div key={quiz.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-900">{quiz.title}</h4>
                  <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 uppercase">Quiz</span>
                </div>

                {question && (
                  <div className="space-y-3 pt-2">
                    <p className="text-sm font-semibold text-slate-800">{question.question}</p>

                    {attempt ? (
                      <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs">
                        <div className={`flex items-center gap-2 font-bold ${attempt.isCorrect ? "text-emerald-700" : "text-rose-700"}`}>
                          {attempt.isCorrect ? <Check className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                          {attempt.isCorrect ? "Correct answer!" : "Needs another review"}
                        </div>
                        <p className="text-slate-600">
                          Your answer: {question.options?.[attempt.selectedIndex]}
                        </p>
                        {!attempt.isCorrect && (
                          <p className="text-slate-600">
                            Correct answer: {question.options?.[question.correct_index]}
                          </p>
                        )}
                        {question.explanation && (
                          <p className="italic text-slate-500 border-t border-slate-200 pt-2 mt-2">
                            Explanation: {question.explanation}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {Array.isArray(question.options) &&
                            question.options.map((opt, idx) => (
                              <button
                                key={idx}
                                disabled={savingId === quiz.id}
                                onClick={() => {
                                  setUserAnswers((prev) => ({ ...prev, [quiz.id]: idx }));
                                  setQuizInProgress({
                                    quiz_id: quiz.id,
                                    title: quiz.title,
                                    question_number: 1,
                                    total: 1,
                                  });
                                  recordQuizAttempt(quiz, idx);
                                }}
                                className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-left text-xs font-medium text-slate-800 hover:border-purple-300 hover:bg-purple-50 transition"
                              >
                                <strong>{String.fromCharCode(65 + idx)}.</strong> {opt}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PracticeQuestions;
