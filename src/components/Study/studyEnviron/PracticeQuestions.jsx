import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  CircleAlert,
  HelpCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  Star,
  Target,
  XCircle,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import supabase from "../../../lib/supabase";
import { useAITutor } from "../../../app/AITutorContext";
import { gamificationService } from "../../../features/gamification";
import { syncAndCheckAchievements } from "../../../lib/achievementSync.js";
import Modal from "../../common/ResponsiveSheet";
import { Card, Button, Badge, ProgressBar } from "../../common/UIKit";

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
    .replace(
      /^\s*["']?(?:question|option|explanation|correct_answer|correct_index|correctIndex)["']?\s*:\s*/i,
      ""
    )
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

/**
 * QuizModal - Interactive One-Question-Per-Screen Quiz Runner
 */
function QuizModal({
  quiz,
  answers,
  saving,
  onSelectAnswer,
  onSubmit,
  onClose,
  onTryAgain,
  onDone,
  result,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null); // { isCorrect, explanation }

  const isResults = Boolean(result);
  const modalOpen = Boolean(quiz || result);

  useEffect(() => {
    if (quiz && answers) {
      const activeQ = quiz.questions[currentIndex];
      if (activeQ && answers[activeQ.id] !== undefined) {
        setSelectedOption(answers[activeQ.id]);
      } else {
        setSelectedOption(null);
        setFeedback(null);
      }
    }
  }, [currentIndex, quiz, answers]);

  if (!modalOpen) return null;

  const activeQuiz = result?.quiz || quiz;
  const activeQuestions = activeQuiz?.questions || [];
  const currentQuestion = activeQuestions[currentIndex];
  const totalQuestions = activeQuestions.length;

  const handleOptionClick = (optionIdx) => {
    if (feedback !== null) return; // Prevent changing after answer confirmed
    setSelectedOption(optionIdx);
    onSelectAnswer(currentQuestion.id, optionIdx);

    const isCorrect = optionIdx === currentQuestion.correctIndex;
    setFeedback({
      isCorrect,
      explanation: currentQuestion.explanation,
    });
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setFeedback(null);
    } else {
      onSubmit();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setFeedback(null);
    }
  };

  return (
    <Modal
      isOpen={modalOpen}
      onClose={onClose}
      title={isResults ? "Quiz Results" : activeQuiz?.title || "Quiz Focus"}
      maxWidth="max-w-xl"
    >
      {isResults ? (
        <div className="flex flex-col items-center text-center gap-6 py-4">
          <div className="p-4 rounded-full bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
            <Trophy className="w-12 h-12" />
          </div>

          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Score: {result.score} / {result.total}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {Math.round((result.score / result.total) * 100)}% Accuracy
            </p>
          </div>

          <ProgressBar
            value={result.score}
            max={result.total}
            variant={result.score / result.total >= 0.7 ? "mint" : "rose"}
          />

          <div className="flex items-center gap-3 w-full mt-4">
            <Button
              variant="outline"
              size="md"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={onTryAgain}
              className="flex-1"
            >
              Review Mistakes
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={onDone}
              className="flex-1 font-bold"
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 py-2">
          {/* Header Progress */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <Badge variant="violet" size="sm">
              {Math.round(((currentIndex + 1) / totalQuestions) * 100)}%
            </Badge>
          </div>

          <ProgressBar value={currentIndex + 1} max={totalQuestions} variant="violet" />

          {/* Question Text */}
          <Card padding="p-6">
            <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              {currentQuestion?.question}
            </h3>
          </Card>

          {/* Answer Options */}
          <div className="flex flex-col gap-3">
            {currentQuestion?.options.map((optionText, idx) => {
              const isSelected = selectedOption === idx;
              let optionStyle =
                "bg-slate-50 dark:bg-[#181432] border-slate-200/80 dark:border-violet-900/40 text-slate-800 dark:text-slate-200";

              if (feedback && isSelected) {
                optionStyle = feedback.isCorrect
                  ? "bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
                  : "bg-rose-50 border-rose-500 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200";
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleOptionClick(idx)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border text-left font-semibold text-sm transition-all min-h-[48px] ${optionStyle}`}
                >
                  <span className="w-7 h-7 rounded-full bg-slate-200 dark:bg-violet-900/60 text-xs font-bold flex items-center justify-center shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{optionText}</span>
                  {feedback && isSelected && (
                    feedback.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )
                  )}
                </button>
              );
            })}
          </div>

          {/* Animated Feedback Box */}
          {feedback && (
            <Card
              variant="default"
              padding="p-4"
              className={
                feedback.isCorrect
                  ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900"
                  : "bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900"
              }
            >
              <div className="flex items-start gap-2">
                {feedback.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide">
                    {feedback.isCorrect ? "Correct!" : "Incorrect"}
                  </p>
                  {feedback.explanation && (
                    <p className="text-xs mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                      {feedback.explanation}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between gap-3 mt-2">
            <Button
              variant="outline"
              size="md"
              onClick={handlePrev}
              isDisabled={currentIndex === 0}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              isDisabled={selectedOption === null || saving}
              isLoading={saving}
              rightIcon={<ChevronRight className="w-4 h-4" />}
              className="font-bold"
            >
              {currentIndex === totalQuestions - 1 ? "Submit Quiz" : "Next Question"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function PracticeQuestions({ studyId, userId, topic, onTimelineEvent, requestedQuizId, onQuizOpened }) {
  const { setQuizInProgress, sendTutorEvent, handleToggle, isOpen, setCurrentMessage } = useAITutor();
  const [quizzes, setQuizzes] = useState([]);
  const [quizAttemptsMap, setQuizAttemptsMap] = useState({});
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

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
  }, [quizzes]);

  const selectAnswer = useCallback((questionId, selectedIndex) => {
    setAnswers((current) => ({ ...current, [questionId]: selectedIndex }));
  }, []);

  const finishQuiz = async () => {
    const activeQuiz = quizzes.find((q) => String(q.id) === String(activeQuizId));
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

      setQuizAttemptsMap((prev) => ({
        ...prev,
        [activeQuiz.id]: [attempt, ...(prev[activeQuiz.id] || [])],
      }));

      setResult({ quiz: activeQuiz, answers: { ...answers }, score, total: activeQuiz.questions.length });
      setActiveQuizId(null);
      syncAndCheckAchievements({ quiet: false });
      gamificationService.checkAndClaimQuests();
    } catch (err) {
      setError(`Unable to save quiz result: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const activeQuiz = quizzes.find((q) => String(q.id) === String(activeQuizId));

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-violet-600" />
            Session Quizzes
          </h2>
          <Button variant="soft" size="sm" onClick={() => loadQuizzes()}>
            Refresh
          </Button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Interactive quiz practice generated specifically for this study topic.
        </p>
      </Card>

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-slate-500">
          Loading practice quizzes...
        </Card>
      ) : quizzes.length === 0 ? (
        <Card className="p-8 flex flex-col items-center text-center gap-3">
          <HelpCircle className="w-8 h-8 text-violet-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Quizzes Available
          </h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Ask your AI Tutor to generate a practice quiz on this topic.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {quizzes.map((q) => {
            const attempts = quizAttemptsMap[q.id] || [];
            const lastAttempt = attempts[0];

            return (
              <Card key={q.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {q.title || "Topic Quiz"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {q.questions.length} Questions
                    </p>
                  </div>
                  {lastAttempt && (
                    <Badge variant={lastAttempt.score / lastAttempt.total >= 0.7 ? "mint" : "amber"} size="sm">
                      Score: {lastAttempt.score}/{lastAttempt.total}
                    </Badge>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => startQuiz(q.id)}
                  className="w-full font-bold mt-1"
                >
                  {lastAttempt ? "Retake Quiz" : "Start Quiz"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {(activeQuiz || result) && (
        <QuizModal
          quiz={activeQuiz}
          answers={answers}
          saving={Boolean(savingId)}
          onSelectAnswer={selectAnswer}
          onSubmit={finishQuiz}
          onClose={() => {
            setActiveQuizId(null);
            setResult(null);
          }}
          onTryAgain={() => {
            setResult(null);
            if (activeQuiz) startQuiz(activeQuiz.id);
          }}
          onDone={() => {
            setActiveQuizId(null);
            setResult(null);
          }}
          result={result}
        />
      )}
    </div>
  );
}

export default PracticeQuestions;
