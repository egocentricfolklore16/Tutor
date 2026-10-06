import { Check, CircleAlert, HelpCircle, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import supabase from "../../../lib/supabase";
import { useAITutor } from "../../../app/AITutorContext";

function PracticeQuestions({ theme, studyId, userId, topic, onTimelineEvent, requestedQuizId, onQuizOpened }) {
  const { setQuizInProgress, sendTutorEvent, handleToggle, isOpen, setCurrentMessage } = useAITutor();
  const [quizzes, setQuizzes] = useState([]);
  const [quizAttemptsMap, setQuizAttemptsMap] = useState({});
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [runAnswers, setRunAnswers] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [reviewingQuizMap, setReviewingQuizMap] = useState({});
  const [lastCompleted, setLastCompleted] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const requestedLookupRef = useRef(null);

  const loadQuizzes = useCallback(async () => {
    if (!studyId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      let activeUserId = userId;
      if (!activeUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        activeUserId = user?.id;
      }

      const { data: quizData, error: quizError } = await supabase
        .from("session_quizzes")
        .select(`
          id, session_id, user_id, title, source, created_at,
          questions:session_quiz_questions(id, quiz_id, position, question, options, correct_index, explanation)
        `)
        .eq("session_id", studyId)
        .order("created_at", { ascending: false });
      if (quizError) throw quizError;

      const quizList = (quizData || []).map((quiz) => ({
        ...quiz,
        questions: [...(quiz.questions || [])].sort((a, b) => a.position - b.position),
      }));
      setQuizzes(quizList);

      if (quizList.length > 0 && activeUserId) {
        const { data: attemptsData, error: attemptsError } = await supabase
          .from("session_quiz_attempts")
          .select("id, quiz_id, score, total, answers, created_at")
          .in("quiz_id", quizList.map((quiz) => quiz.id))
          .eq("user_id", activeUserId)
          .order("created_at", { ascending: false });
        if (attemptsError) throw attemptsError;

        const attemptsByQuiz = {};
        (attemptsData || []).forEach((attempt) => {
          if (!attemptsByQuiz[attempt.quiz_id]) attemptsByQuiz[attempt.quiz_id] = [];
          attemptsByQuiz[attempt.quiz_id].push(attempt);
        });
        setQuizAttemptsMap(attemptsByQuiz);
      } else {
        setQuizAttemptsMap({});
      }
    } catch (err) {
      setError(err.message || "Failed to load quizzes.");
    } finally {
      setIsLoading(false);
    }
  }, [studyId, userId]);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const totalQuestions = useMemo(
    () => quizzes.reduce((total, quiz) => total + (quiz.questions?.length || 0), 0),
    [quizzes]
  );

  const startQuiz = useCallback((quizId) => {
    const quiz = quizzes.find((item) => String(item.id) === String(quizId));
    if (!quiz?.questions?.length) {
      setError("This quiz does not have any questions yet.");
      return;
    }
    setError("");
    setActiveQuizId(quiz.id);
    setQuestionIndex(0);
    setRunAnswers([]);
    setSelectedIndex(null);
    setIsAnswerChecked(false);
    setLastCompleted(null);
    setQuizInProgress({
      quiz_id: quiz.id,
      title: quiz.title,
      question_number: 1,
      total: quiz.questions.length,
    });
  }, [quizzes, setQuizInProgress]);

  useEffect(() => {
    if (!requestedQuizId || isLoading) return;
    const requestedQuiz = quizzes.find((quiz) => String(quiz.id) === String(requestedQuizId));
    if (requestedQuiz) {
      startQuiz(requestedQuiz.id);
      requestedLookupRef.current = null;
      onQuizOpened?.();
      return;
    }
    if (requestedLookupRef.current !== String(requestedQuizId)) {
      requestedLookupRef.current = String(requestedQuizId);
      loadQuizzes();
    } else {
      setError("That practice set could not be found in this study session. Refresh your library and try again.");
    }
  }, [requestedQuizId, quizzes, isLoading, startQuiz, onQuizOpened, loadQuizzes]);

  const finishQuiz = async (quiz, answers) => {
    if (savingId) return;
    setSavingId(quiz.id);
    setError("");
    try {
      let activeUserId = userId;
      if (!activeUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        activeUserId = user?.id;
      }
      if (!activeUserId) throw new Error("Your sign-in session expired. Please sign in again.");

      const score = answers.filter((answer) => answer.correct).length;
      const { data: attempt, error: attemptError } = await supabase
        .from("session_quiz_attempts")
        .insert({
          quiz_id: quiz.id,
          user_id: activeUserId,
          score,
          total: quiz.questions.length,
          answers,
        })
        .select()
        .single();
      if (attemptError) throw attemptError;

      setQuizAttemptsMap((previous) => ({
        ...previous,
        [quiz.id]: [attempt, ...(previous[quiz.id] || [])],
      }));
      setLastCompleted({ quizId: quiz.id, score, total: quiz.questions.length });
      setActiveQuizId(null);
      setQuizInProgress(null);
      if (onTimelineEvent) {
        onTimelineEvent({
          id: crypto.randomUUID(),
          type: "quiz",
          refId: String(quiz.id),
          title: `Quiz completed: ${quiz.title} (${score}/${quiz.questions.length})`,
          timestamp: new Date().toISOString(),
        });
      }
      sendTutorEvent("quiz_finished", {
        quiz_id: quiz.id,
        score,
        total: quiz.questions.length,
      });
    } catch (err) {
      setError(`Unable to save your quiz result: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const checkAnswer = () => {
    const quiz = quizzes.find((item) => item.id === activeQuizId);
    const question = quiz?.questions?.[questionIndex];
    if (!quiz || !question || selectedIndex === null) return;

    const answer = {
      question_id: question.id,
      selected_index: selectedIndex,
      correct: selectedIndex === question.correct_index,
    };
    const nextAnswers = [...runAnswers, answer];
    setRunAnswers(nextAnswers);
    setIsAnswerChecked(true);
  };

  const continueQuiz = () => {
    const quiz = quizzes.find((item) => item.id === activeQuizId);
    if (!quiz) return;
    if (questionIndex === quiz.questions.length - 1) {
      finishQuiz(quiz, runAnswers);
      return;
    }
    const nextIndex = questionIndex + 1;
    setQuestionIndex(nextIndex);
    setSelectedIndex(null);
    setIsAnswerChecked(false);
    setQuizInProgress({
      quiz_id: quiz.id,
      title: quiz.title,
      question_number: nextIndex + 1,
      total: quiz.questions.length,
    });
  };

  const askTutorToCreateQuiz = () => {
    setCurrentMessage(`Make me a ${topic ? `quiz on ${topic}` : "quiz"} using my study materials. Start with 5 questions at the session difficulty.`);
    if (!isOpen) handleToggle();
  };

  const activeQuiz = quizzes.find((quiz) => quiz.id === activeQuizId);
  const activeQuestion = activeQuiz?.questions?.[questionIndex];
  const attemptsCount = Object.values(quizAttemptsMap).reduce((count, attempts) => count + attempts.length, 0);

  return (
    <div className="mb-8 space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-900 px-6 py-7 text-white sm:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-200">Quizicle · Active recall</p>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Practice what you&apos;ve learned</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100">
                Work through one question at a time. You&apos;ll get an explanation as you go and a saved score when you finish.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <div className="text-xl font-black">{quizzes.length}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-100">Quizzes</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <div className="text-xl font-black">{attemptsCount}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-100">Attempts</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {lastCompleted && !activeQuiz && (
            <div role="status" className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-bold text-emerald-900">Practice set complete</p>
                <p className="mt-1 text-sm text-emerald-800">You scored {lastCompleted.score} out of {lastCompleted.total}. Your answers and explanations are saved below.</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewingQuizMap((previous) => ({ ...previous, [lastCompleted.quizId]: true }))}
                className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-emerald-800 shadow-sm hover:bg-emerald-100"
              >
                Review answers
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-8 text-sm font-medium text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading your practice sets...
            </div>
          ) : activeQuiz && activeQuestion ? (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">{activeQuiz.title}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">Question {questionIndex + 1} of {activeQuiz.questions.length}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveQuizId(null);
                    setQuizInProgress(null);
                  }}
                  className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-white hover:text-slate-800"
                >
                  Exit quiz
                </button>
              </div>
              <div className="mb-6 h-2 overflow-hidden rounded-full bg-indigo-100" aria-label={`Question ${questionIndex + 1} of ${activeQuiz.questions.length}`}>
                <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${((questionIndex + 1) / activeQuiz.questions.length) * 100}%` }} />
              </div>
              <h3 className="text-lg font-bold leading-7 text-slate-900 sm:text-xl">{activeQuestion.question}</h3>
              <div className="mt-5 grid gap-2.5">
                {(activeQuestion.options || []).map((option, index) => {
                  const isCorrectOption = index === activeQuestion.correct_index;
                  const isSelected = index === selectedIndex;
                  const answerStyle = isAnswerChecked && isCorrectOption
                    ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                    : isAnswerChecked && isSelected
                    ? "border-rose-300 bg-rose-50 text-rose-900"
                    : isSelected
                    ? "border-indigo-400 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-100"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/60";
                  return (
                    <button
                      key={`${activeQuestion.id}-${index}`}
                      type="button"
                      disabled={isAnswerChecked}
                      onClick={() => setSelectedIndex(index)}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left text-sm font-semibold transition ${answerStyle}`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="pt-0.5">{option}</span>
                    </button>
                  );
                })}
              </div>

              {isAnswerChecked && (
                <div className={`mt-4 rounded-xl p-4 text-sm ${runAnswers.at(-1)?.correct ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}>
                  <p className="font-bold">{runAnswers.at(-1)?.correct ? "That’s right." : "Not quite — use this to learn."}</p>
                  <p className="mt-1 leading-6">{activeQuestion.explanation || `The correct answer is ${activeQuestion.options?.[activeQuestion.correct_index]}.`}</p>
                </div>
              )}

              <div className="mt-5 flex justify-end">
                {!isAnswerChecked ? (
                  <button
                    type="button"
                    disabled={selectedIndex === null}
                    onClick={checkAnswer}
                    className={`rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${theme?.accentButton || "bg-indigo-600 hover:bg-indigo-700"}`}
                  >
                    Check answer
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={savingId === activeQuiz.id}
                    onClick={continueQuiz}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                  >
                    {savingId === activeQuiz.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    {questionIndex === activeQuiz.questions.length - 1 ? "Finish and save score" : "Next question"}
                  </button>
                )}
              </div>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Your first practice set starts with a conversation</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                Ask your tutor to build questions from this session&apos;s materials. You can choose a topic, difficulty, and what you want to practise.
              </p>
              <button
                type="button"
                onClick={askTutorToCreateQuiz}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800"
              >
                <Sparkles className="h-4 w-4" /> Ask my tutor for a quiz
              </button>
              <p className="mt-3 text-xs text-slate-400">No content is generated until you ask.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {quizzes.map((quiz) => {
                const attempts = quizAttemptsMap[quiz.id] || [];
                const latestAttempt = attempts[0];
                const bestScore = attempts.reduce((best, attempt) => Math.max(best, Number(attempt.score || 0)), 0);
                return (
                  <article key={quiz.id} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">{quiz.source === "ai" ? "Tutor-made" : "Practice set"}</p>
                        <h3 className="mt-1 font-bold text-slate-900">{quiz.title}</h3>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        {quiz.questions.length} {quiz.questions.length === 1 ? "question" : "questions"}
                      </span>
                    </div>
                    {latestAttempt ? (
                      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs">
                        <span className="font-semibold text-slate-600">
                          Latest {latestAttempt.score}/{latestAttempt.total}
                          {attempts.length > 1 && ` · best ${bestScore}/${latestAttempt.total}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setReviewingQuizMap((previous) => ({ ...previous, [quiz.id]: !previous[quiz.id] }))}
                          className="font-bold text-indigo-700 hover:text-indigo-900"
                        >
                          {reviewingQuizMap[quiz.id] ? "Hide review" : "Review"}
                        </button>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">Ready when you are. Take your time and learn from each answer.</p>
                    )}
                    {reviewingQuizMap[quiz.id] && latestAttempt && (
                      <div className="mt-3 space-y-2">
                        {(latestAttempt.answers || []).map((answer, index) => {
                          const question = quiz.questions.find((item) => item.id === answer.question_id) || quiz.questions[index];
                          return (
                            <div key={answer.question_id || index} className="rounded-xl border border-slate-100 p-3 text-xs">
                              <p className="font-semibold text-slate-800">{index + 1}. {question?.question}</p>
                              <p className={`mt-1 ${answer.correct ? "text-emerald-700" : "text-rose-700"}`}>
                                Your answer: {question?.options?.[answer.selected_index] || "Not answered"}
                              </p>
                              {!answer.correct && (
                                <p className="mt-1 text-slate-500">Correct answer: {question?.options?.[question?.correct_index]}</p>
                              )}
                              {question?.explanation && <p className="mt-1 leading-5 text-slate-500">{question.explanation}</p>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => startQuiz(quiz.id)}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      {latestAttempt ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      {latestAttempt ? "Retake practice set" : "Start practice set"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
          {!isLoading && quizzes.length > 0 && (
            <p className="px-1 text-xs text-slate-400">
              {totalQuestions} questions across {quizzes.length} practice {quizzes.length === 1 ? "set" : "sets"} · your attempts are saved to this session.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default PracticeQuestions;
