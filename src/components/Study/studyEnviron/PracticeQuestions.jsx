import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  HelpCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  Star,
  Target,
  Trophy,
  XCircle,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import supabase from "../../../lib/supabase";
import { useAITutor } from "../../../app/AITutorContext";

function cleanQuizString(value) {
  if (typeof value !== "string") return "";
  let cleaned = value.trim().replace(/,\s*$/, "");

  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    try {
      cleaned = JSON.parse(cleaned);
    } catch {
      cleaned = cleaned.slice(1, -1);
    }
  }

  return cleaned
    .replace(/^\s*["']?(?:question|option|explanation|correct_answer|correct_index|correctIndex)["']?\s*:\s*/i, "")
    .replace(/,\s*$/, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

function normalizeQuizQuestion(row, position) {
  if (!row || typeof row !== "object") {
    throw new Error(`Question ${position + 1} is not a valid object.`);
  }

  let options = row.options;
  if (typeof options === "string") {
    try {
      options = JSON.parse(options);
    } catch {
      throw new Error(`Question ${position + 1} has invalid options.`);
    }
  }
  if (!Array.isArray(options) || options.length < 2 || options.length > 4) {
    throw new Error(`Question ${position + 1} must have between two and four options.`);
  }

  options = options.map(cleanQuizString);
  if (options.some((option) => !option)) {
    throw new Error(`Question ${position + 1} has an empty option.`);
  }

  const question = cleanQuizString(row.question);
  if (!question) throw new Error(`Question ${position + 1} has no question text.`);

  const rawCorrectIndex = row.correct_index ?? row.correctIndex;
  const rawCorrectAnswer = row.correct_answer ?? row.correctAnswer;
  let correctIndex = -1;

  if (typeof rawCorrectIndex === "number" && Number.isInteger(rawCorrectIndex)) {
    correctIndex = rawCorrectIndex;
  } else {
    const correctValue = cleanQuizString(
      rawCorrectIndex === undefined || rawCorrectIndex === null
        ? rawCorrectAnswer
        : String(rawCorrectIndex)
    );
    if (/^[A-D]$/i.test(correctValue)) {
      correctIndex = correctValue.toUpperCase().charCodeAt(0) - 65;
    } else if (/^\d+$/.test(correctValue)) {
      correctIndex = Number(correctValue);
    } else {
      correctIndex = options.findIndex(
        (option) => option.toLocaleLowerCase() === correctValue.toLocaleLowerCase()
      );
    }
  }

  if (correctIndex < 0 || correctIndex > 3 || correctIndex >= options.length) {
    throw new Error(`Question ${position + 1} has an invalid correct answer.`);
  }

  const explanation = cleanQuizString(row.explanation);
  return {
    id: String(row.id ?? `question-${position + 1}`),
    question,
    options,
    correctIndex,
    ...(explanation ? { explanation } : {}),
  };
}

function QuizModal({
  quiz,
  answers,
  theme,
  saving,
  onSelectAnswer,
  onSubmit,
  onClose,
  onTryAgain,
  onDone,
  result,
}) {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [focusedQuestionIndex, setFocusedQuestionIndex] = useState(0);
  const [ringAnimated, setRingAnimated] = useState(false);

  const isResults = Boolean(result);
  const modalOpen = Boolean(quiz || result);
  const answeredCount = quiz
    ? quiz.questions.filter((question) => answers[question.id] !== undefined).length
    : 0;
  const remaining = quiz ? quiz.questions.length - answeredCount : 0;
  const scorePercent = result ? Math.round((result.score / result.total) * 100) : 0;
  const ringColor = scorePercent < 50
    ? "text-red-600 dark:text-red-400"
    : scorePercent < 80
      ? "text-amber-600 dark:text-amber-400"
      : "text-green-600 dark:text-green-400";
  const scoreIcon = scorePercent < 50
    ? <BookOpen className="h-7 w-7 text-red-600 dark:text-red-400" aria-hidden="true" />
    : scorePercent < 80
      ? <Award className="h-7 w-7 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      : <Star className="h-7 w-7 text-green-600 dark:text-green-400" aria-hidden="true" />;
  const headline = scorePercent < 50 ? "Study more!" : scorePercent < 80 ? "Good job!" : "Excellent!";
  const circumference = 2 * Math.PI * 48;
  const handleClose = () => {
    if (!isResults && answeredCount > 0 && !window.confirm("Close this quiz? Your selected answers will be lost.")) {
      return;
    }
    onClose();
  };
  const interactionRef = useRef({});
  interactionRef.current = {
    quiz,
    isResults,
    focusedQuestionIndex,
    handleClose,
    onSelectAnswer,
  };

  useEffect(() => {
    if (!result) {
      setRingAnimated(false);
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => setRingAnimated(true));
    return () => window.cancelAnimationFrame(frame);
  }, [result]);

  useEffect(() => {
    if (result) closeButtonRef.current?.focus();
  }, [result]);

  useEffect(() => {
    if (!modalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const isTypingTarget = (target) => target instanceof HTMLElement && (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable
    );

    const handleKeyDown = (event) => {
      if (isTypingTarget(event.target)) return;

      if (event.key === "Escape") {
        event.preventDefault();
        interactionRef.current.handleClose();
        return;
      }

      const { quiz: currentQuiz, isResults: showingResults, focusedQuestionIndex: focusedIndex } = interactionRef.current;
      if (!showingResults && currentQuiz && /^[a-d]$/i.test(event.key)) {
        const question = currentQuiz.questions[focusedIndex];
        const selectedIndex = event.key.toUpperCase().charCodeAt(0) - 65;
        if (question && selectedIndex < question.options.length) {
          event.preventDefault();
          interactionRef.current.onSelectAnswer(question.id, selectedIndex);
          const option = modalRef.current?.querySelector(
            `[data-question-id="${CSS.escape(question.id)}"] [data-option-index="${selectedIndex}"]`
          );
          option?.focus();
        }
        return;
      }

      if (event.key === "Tab" && modalRef.current) {
        const focusable = [...modalRef.current.querySelectorAll(
          'button:not([disabled]), [tabindex="0"], [role="radio"][tabindex="0"]'
        )].filter((element) => !element.hasAttribute("hidden"));
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [modalOpen]);

  if ((!quiz && !result) || typeof document === "undefined") return null;

  const activeQuiz = result?.quiz || quiz;
  const activeAnswers = result?.answers || answers;
  const accentButton = theme?.quizAccentButton || "bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-400";
  const accentSurface = theme?.quizAccentSurface || "bg-green-50 dark:bg-green-950/35";
  const accentBorder = theme?.quizAccentBorder || "border-green-500 dark:border-green-400";
  const accentText = theme?.quizAccentText || "text-green-700 dark:text-green-300";

  const handleFocusQuestion = (index) => setFocusedQuestionIndex(index);

  return createPortal((
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm dark:bg-black/70">
      <section
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-modal-title"
        className="motion-dialog flex max-h-[90dvh] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-[#18211f] dark:text-slate-100"
      >
        <header className="relative shrink-0 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isResults ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : `${accentSurface} ${accentText}`}`}>
                {isResults ? <Trophy className="h-5 w-5" aria-hidden="true" /> : <ClipboardList className="h-5 w-5" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <h2 id="quiz-modal-title" className="text-lg font-bold sm:text-xl">
                  {isResults ? "Quiz Results" : "Quiz"}
                </h2>
                {!isResults && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {answeredCount} of {quiz.questions.length} answered
                  </p>
                )}
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleClose}
              aria-label="Close quiz"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:ring-slate-400"
            >
              <span>Close</span>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {!isResults && (
            <div
              className="absolute inset-x-0 bottom-0 h-1 bg-slate-100 dark:bg-slate-800"
              role="progressbar"
              aria-label="Quiz answers completed"
              aria-valuemin={0}
              aria-valuemax={quiz.questions.length}
              aria-valuenow={answeredCount}
            >
              <div
                className={`h-full transition-[width] duration-300 ${theme?.quizAccentFill || "bg-green-600 dark:bg-green-500"}`}
                style={{ width: `${(answeredCount / quiz.questions.length) * 100}%` }}
              />
            </div>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
          {isResults ? (
            <div className="space-y-7">
              <section className="flex flex-col items-center text-center">
                <div className="relative mb-4 flex h-32 w-32 items-center justify-center">
                  <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
                    <circle cx="60" cy="60" r="48" fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="9" />
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      className={`${ringColor} transition-[stroke-dashoffset] duration-1000 ease-out`}
                      stroke="currentColor"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={ringAnimated ? circumference * (1 - scorePercent / 100) : circumference}
                    />
                  </svg>
                  <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                    {scorePercent}%
                  </span>
                </div>
                <div className="mb-2">{scoreIcon}</div>
                <h3 className="text-2xl font-extrabold tracking-tight">{headline}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {result.score} correct out of {result.total} questions
                </p>
                <div className="mt-5 grid w-full grid-cols-2 gap-3 sm:max-w-md">
                  <button
                    type="button"
                    onClick={onTryAgain}
                    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#18211f] ${accentButton}`}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={onDone}
                    className="min-h-12 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-slate-400"
                  >
                    Done
                  </button>
                </div>
              </section>

              <section aria-labelledby="quiz-review-title">
                <h3 id="quiz-review-title" className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Review Answers
                </h3>
                <div className="space-y-3">
                  {activeQuiz.questions.map((question, index) => {
                    const selectedIndex = activeAnswers[question.id];
                    const isCorrect = selectedIndex === question.correctIndex;
                    return (
                      <article
                        key={question.id}
                        className={`rounded-2xl border p-4 ${
                          isCorrect
                            ? "border-green-200 bg-green-50 dark:border-green-900/70 dark:bg-green-950/30"
                            : "border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {isCorrect
                            ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700 dark:text-green-400" aria-hidden="true" />
                            : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" aria-hidden="true" />}
                          <p className="min-w-0 break-words text-sm font-semibold leading-6 text-slate-900 dark:text-slate-100">
                            {index + 1}. {question.question}
                          </p>
                        </div>
                        <div className="mt-2 pl-[1.875rem] text-sm leading-6">
                          {isCorrect ? (
                            <p className="font-semibold text-green-700 dark:text-green-400">
                              You: {String.fromCharCode(65 + selectedIndex)}
                            </p>
                          ) : (
                            <>
                              <p className="font-semibold text-red-700 dark:text-red-400">
                                You: {selectedIndex === undefined ? "Not answered" : String.fromCharCode(65 + selectedIndex)}
                              </p>
                              <p className="font-semibold text-green-700 dark:text-green-400">
                                Correct: {String.fromCharCode(65 + question.correctIndex)}
                              </p>
                            </>
                          )}
                          {question.explanation && (
                            <p className="mt-2 text-slate-600 dark:text-slate-400">{question.explanation}</p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-4">
              {quiz.questions.map((question, questionIndex) => (
                <article
                  key={question.id}
                  data-question-id={question.id}
                  tabIndex={0}
                  onFocus={() => handleFocusQuestion(questionIndex)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-900/45 dark:focus-visible:ring-slate-500 sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${accentSurface} ${accentText}`}>
                      {questionIndex + 1}
                    </span>
                    <h3 className="min-w-0 break-words pt-0.5 text-base font-semibold leading-7 text-slate-900 dark:text-slate-100 sm:text-lg">
                      {question.question}
                    </h3>
                  </div>
                  <div className="mt-4 grid gap-2.5" role="radiogroup" aria-label={`Question ${questionIndex + 1} options`}>
                    {question.options.map((option, optionIndex) => {
                      const isSelected = answers[question.id] === optionIndex;
                      return (
                        <button
                          key={`${question.id}-${optionIndex}`}
                          data-option-index={optionIndex}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={isSelected || (answers[question.id] === undefined && optionIndex === 0) ? 0 : -1}
                          onFocus={() => handleFocusQuestion(questionIndex)}
                          onClick={() => onSelectAnswer(question.id, optionIndex)}
                          className={`flex min-h-14 w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm font-normal leading-6 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:px-4 ${
                            isSelected
                              ? `${accentSurface} ${accentBorder} ${accentText} focus-visible:ring-slate-500 dark:focus-visible:ring-slate-400`
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-slate-100 focus-visible:ring-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:focus-visible:ring-slate-400"
                          }`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                            isSelected
                              ? `${theme?.quizAccentFill || "bg-green-600 dark:bg-green-500"} border-transparent text-white`
                              : "border-slate-400 bg-white text-slate-600 dark:border-slate-500 dark:bg-slate-900 dark:text-slate-300"
                          }`}>
                            {isSelected ? <Check className="h-4 w-4" aria-hidden="true" /> : String.fromCharCode(65 + optionIndex)}
                          </span>
                          <span className="min-w-0 break-words">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {!isResults && (
          <footer className="shrink-0 border-t border-slate-200 bg-white/95 p-4 dark:border-slate-700 dark:bg-[#18211f]/95 sm:px-7">
            <button
              type="button"
              disabled={remaining > 0 || saving}
              onClick={onSubmit}
              className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#18211f] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-800 dark:disabled:text-slate-500 ${
                remaining > 0
                  ? ""
                  : `${accentButton} focus-visible:ring-slate-500 dark:focus-visible:ring-slate-400`
              }`}
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving results...</>
                : remaining > 0
                  ? <><Target className="h-4 w-4" aria-hidden="true" /> {remaining} more to go</>
                  : "Submit Quiz"}
            </button>
          </footer>
        )}
      </section>
    </div>
  ), document.body);
}

function PracticeQuestions({ theme, studyId, userId, topic, onTimelineEvent, requestedQuizId, onQuizOpened }) {
  const { setQuizInProgress, sendTutorEvent, handleToggle, isOpen, setCurrentMessage } = useAITutor();
  const [quizzes, setQuizzes] = useState([]);
  const [quizAttemptsMap, setQuizAttemptsMap] = useState({});
  const [reviewingQuizMap, setReviewingQuizMap] = useState({});
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
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
        questions: [...(quiz.questions || [])]
          .sort((a, b) => a.position - b.position)
          .map(normalizeQuizQuestion),
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
  const activeQuiz = quizzes.find((quiz) => String(quiz.id) === String(activeQuizId));

  const startQuiz = useCallback((quizId) => {
    const quiz = quizzes.find((item) => String(item.id) === String(quizId));
    if (!quiz?.questions?.length) {
      setError("This quiz does not have any questions yet.");
      return;
    }
    setError("");
    setResult(null);
    setActiveQuizId(quiz.id);
    setAnswers({});
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

  const closeQuiz = useCallback(() => {
    setActiveQuizId(null);
    setResult(null);
    setQuizInProgress(null);
  }, [setQuizInProgress]);

  const selectAnswer = useCallback((questionId, selectedIndex) => {
    setAnswers((current) => ({ ...current, [questionId]: selectedIndex }));
  }, []);

  const finishQuiz = async () => {
    if (!activeQuiz || savingId) return;
    setSavingId(activeQuiz.id);
    setError("");
    try {
      let activeUserId = userId;
      if (!activeUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        activeUserId = user?.id;
      }
      if (!activeUserId) throw new Error("Your sign-in session expired. Please sign in again.");

      const attemptAnswers = activeQuiz.questions.map((question) => {
        const selectedIndex = answers[question.id];
        return {
          question_id: question.id,
          selected_index: selectedIndex,
          correct: selectedIndex === question.correctIndex,
        };
      });
      const score = attemptAnswers.filter((answer) => answer.correct).length;
      const { data: attempt, error: attemptError } = await supabase
        .from("session_quiz_attempts")
        .insert({
          quiz_id: activeQuiz.id,
          user_id: activeUserId,
          score,
          total: activeQuiz.questions.length,
          answers: attemptAnswers,
        })
        .select()
        .single();
      if (attemptError) throw attemptError;

      setQuizAttemptsMap((previous) => ({
        ...previous,
        [activeQuiz.id]: [attempt, ...(previous[activeQuiz.id] || [])],
      }));
      setLastCompleted({ quizId: activeQuiz.id, score, total: activeQuiz.questions.length });
      setResult({ quiz: activeQuiz, answers: { ...answers }, score, total: activeQuiz.questions.length });
      setActiveQuizId(null);
      setQuizInProgress(null);
      if (onTimelineEvent) {
        onTimelineEvent({
          id: crypto.randomUUID(),
          type: "quiz",
          refId: String(activeQuiz.id),
          title: `Quiz completed: ${activeQuiz.title} (${score}/${activeQuiz.questions.length})`,
          timestamp: new Date().toISOString(),
        });
      }
      sendTutorEvent("quiz_finished", {
        quiz_id: activeQuiz.id,
        score,
        total: activeQuiz.questions.length,
      });
    } catch (err) {
      setError(`Unable to save your quiz result: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const tryAgain = () => {
    const quizId = result?.quiz.id;
    setResult(null);
    if (quizId) startQuiz(quizId);
  };

  const askTutorToCreateQuiz = () => {
    setCurrentMessage(`Make me a ${topic ? `quiz on ${topic}` : "quiz"} using my study materials. Start with 5 questions at the session difficulty.`);
    if (!isOpen) handleToggle();
  };

  const attemptsCount = Object.values(quizAttemptsMap).reduce((count, attempts) => count + attempts.length, 0);

  return (
    <>
      <div className="mb-8 space-y-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#18211f]">
          <div className="bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-900 px-6 py-7 text-white dark:from-violet-800 dark:via-indigo-900 dark:to-slate-950 sm:px-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-200 dark:text-violet-200">Quizicle · Active recall</p>
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Practice what you&apos;ve learned</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100 dark:text-indigo-100">
                  Work through a complete quiz, then review each answer and explanation.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="rounded-2xl bg-white/10 px-4 py-3 dark:bg-white/5">
                  <div className="text-xl font-black">{quizzes.length}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-100 dark:text-indigo-100">Quizzes</div>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 dark:bg-white/5">
                  <div className="text-xl font-black">{attemptsCount}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-100 dark:text-indigo-100">Attempts</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-300">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {lastCompleted && !activeQuiz && !result && (
              <div role="status" className="flex flex-col justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900/70 dark:bg-green-950/30 sm:flex-row sm:items-center">
                <div>
                  <p className="font-bold text-green-900 dark:text-green-200">Practice set complete</p>
                  <p className="mt-1 text-sm text-green-800 dark:text-green-300">You scored {lastCompleted.score} out of {lastCompleted.total}. Your answers and explanations are saved below.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewingQuizMap((previous) => ({ ...previous, [lastCompleted.quizId]: true }))}
                  className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-green-800 shadow-sm hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 dark:bg-slate-800 dark:text-green-300 dark:hover:bg-slate-700 dark:focus-visible:ring-green-400"
                >
                  Review answers
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-8 text-sm font-medium text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading your practice sets...
              </div>
            ) : quizzes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/45">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                  <HelpCircle className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Your first practice set starts with a conversation</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Ask your tutor to build questions from this session&apos;s materials. You can choose a topic, difficulty, and what you want to practise.
                </p>
                <button
                  type="button"
                  onClick={askTutorToCreateQuiz}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#18211f]"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> Ask my tutor for a quiz
                </button>
                <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">No content is generated until you ask.</p>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-3">
                {quizzes.map((quiz) => {
                  const attempts = quizAttemptsMap[quiz.id] || [];
                  const latestAttempt = attempts[0];
                  const bestScore = attempts.reduce((best, attempt) => Math.max(best, Number(attempt.score || 0)), 0);
                  return (
                    <article key={quiz.id} className="w-full rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/45 dark:hover:border-indigo-700">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">{quiz.source === "ai" ? "Tutor-made" : "Practice set"}</p>
                          <h3 className="mt-1 font-bold text-slate-900 dark:text-slate-100">{quiz.title}</h3>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {quiz.questions.length} {quiz.questions.length === 1 ? "question" : "questions"}
                        </span>
                      </div>
                      {latestAttempt ? (
                        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs dark:bg-slate-800/70">
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            Latest {latestAttempt.score}/{latestAttempt.total}
                            {attempts.length > 1 && ` · best ${bestScore}/${latestAttempt.total}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setReviewingQuizMap((previous) => ({ ...previous, [quiz.id]: !previous[quiz.id] }))}
                            className="rounded font-bold text-indigo-700 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200 dark:focus-visible:ring-indigo-400"
                          >
                            {reviewingQuizMap[quiz.id] ? "Hide review" : "Review"}
                          </button>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Ready when you are. Take your time and learn from each answer.</p>
                      )}
                      {reviewingQuizMap[quiz.id] && latestAttempt && (
                        <div className="mt-3 space-y-2">
                          {(latestAttempt.answers || []).map((answer, index) => {
                            const question = quiz.questions.find((item) => item.id === answer.question_id) || quiz.questions[index];
                            if (!question) return null;
                            return (
                              <div key={answer.question_id || index} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700">
                                <p className="break-words font-semibold text-slate-800 dark:text-slate-200">{index + 1}. {question.question}</p>
                                <p className={`mt-1 font-semibold ${answer.correct ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                                  Your answer: {question.options?.[answer.selected_index] || "Not answered"}
                                </p>
                                {!answer.correct && (
                                  <p className="mt-1 text-green-700 dark:text-green-400">Correct answer: {question.options?.[question.correctIndex]}</p>
                                )}
                                {question.explanation && <p className="mt-1 leading-5 text-slate-500 dark:text-slate-400">{question.explanation}</p>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => startQuiz(quiz.id)}
                        className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#18211f] ${theme?.quizAccentButton || "bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-400"}`}
                      >
                        {latestAttempt ? <RotateCcw className="h-4 w-4" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                        {latestAttempt ? "Retake practice set" : "Start practice set"}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
            {!isLoading && quizzes.length > 0 && (
              <p className="px-1 text-xs text-slate-400 dark:text-slate-500">
                {totalQuestions} questions across {quizzes.length} practice {quizzes.length === 1 ? "set" : "sets"} · your attempts are saved to this session.
              </p>
            )}
          </div>
        </section>
      </div>

      {(activeQuiz || result) && (
        <QuizModal
          quiz={activeQuiz}
          answers={answers}
          theme={theme}
          saving={Boolean(savingId)}
          onSelectAnswer={selectAnswer}
          onSubmit={finishQuiz}
          onClose={closeQuiz}
          onTryAgain={tryAgain}
          onDone={closeQuiz}
          result={result}
        />
      )}
    </>
  );
}

export default PracticeQuestions;
