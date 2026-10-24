import React, { useEffect, useState, useRef, useTransition, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import supabase from "../../lib/supabase.js";
import {
  validateDisplayName,
  QUESTION_STEPS,
  INITIAL_FORM,
  mapDailyTimeToWeeklyHours,
  validateStepAnswer,
} from "../../lib/onboarding.js";

export default function Onboarding({ session: _session }) {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inlineNotice, setInlineNotice] = useState("");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [, startTransition] = useTransition();

  const textInputRef = useRef(null);
  const otherInputRef = useRef(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Fetch initial profile & restore progress
  useEffect(() => {
    let mounted = true;

    const loadUserDataAndProgress = async () => {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (mounted) navigate("/login", { replace: true });
          return;
        }

        const rawName =
          user.user_metadata?.full_name ||
          user.user_metadata?.userName ||
          user.email?.split("@")[0] ||
          "Learner";
        const derivedFirstName = rawName.trim().split(" ")[0] || "Learner";

        const [{ data: profile }, { data: savedAnswers }] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "username, full_name, primary_goal, education_level, subjects, learning_style, weekly_hours, onboarding_step, onboarding_completed"
            )
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("onboarding_answers")
            .select("question_key, answer")
            .eq("user_id", user.id),
        ]);

        if (!mounted) return;

        if (profile?.onboarding_completed) {
          navigate("/Dashboard", { replace: true });
          return;
        }

        const updatedForm = { ...INITIAL_FORM };
        updatedForm.display_name =
          profile?.username || profile?.full_name || derivedFirstName;

        if (profile?.primary_goal) updatedForm.primary_goal = profile.primary_goal;
        if (profile?.education_level) updatedForm.education_level = profile.education_level;
        if (Array.isArray(profile?.subjects) && profile.subjects.length > 0) {
          updatedForm.subjects = profile.subjects;
        }
        if (Array.isArray(profile?.learning_style) && profile.learning_style.length > 0) {
          updatedForm.learning_style = profile.learning_style;
        } else if (typeof profile?.learning_style === "string" && profile.learning_style.trim()) {
          updatedForm.learning_style = [profile.learning_style.trim()];
        }

        if (savedAnswers && savedAnswers.length > 0) {
          savedAnswers.forEach((item) => {
            if (item.question_key === "display_name" && item.answer) {
              updatedForm.display_name = item.answer;
            }
            if (item.question_key === "subjects") {
              if (Array.isArray(item.answer)) {
                const knownOptions = [
                  "Math",
                  "Science",
                  "Computer Science",
                  "Languages",
                  "Humanities",
                  "Business",
                  "Exam Prep",
                ];
                const selectedKnown = item.answer.filter((s) => knownOptions.includes(s));
                const custom = item.answer.find((s) => !knownOptions.includes(s));
                updatedForm.subjects = selectedKnown;
                if (custom) updatedForm.otherSubject = custom;
              }
            }
            if (item.question_key === "primary_goal" && item.answer) {
              updatedForm.primary_goal = item.answer;
            }
            if (item.question_key === "education_level" && item.answer) {
              updatedForm.education_level = item.answer;
            }
            if (item.question_key === "learning_style" && item.answer) {
              if (Array.isArray(item.answer)) {
                updatedForm.learning_style = item.answer;
              } else if (typeof item.answer === "string") {
                updatedForm.learning_style = [item.answer];
              }
            }
            if (item.question_key === "daily_time" && item.answer) {
              updatedForm.daily_time = item.answer;
            }
          });
        }

        setForm(updatedForm);

        const savedStepIndex =
          typeof profile?.onboarding_step === "number"
            ? profile.onboarding_step
            : 0;
        const clampedStep = Math.min(
          Math.max(0, savedStepIndex),
          QUESTION_STEPS.length - 2 // Don't land directly on completion
        );
        setCurrentStepIndex(clampedStep);
      } catch (err) {
        console.error("Error loading onboarding state:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadUserDataAndProgress();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  // Focus input automatically on step change
  useEffect(() => {
    if (loading) return;
    setInlineNotice("");
    const timer = setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentStepIndex, loading]);

  const currentStep = QUESTION_STEPS[currentStepIndex];
  const isLastQuestion = currentStepIndex === QUESTION_STEPS.length - 2;
  const isCompletionScreen = currentStep.type === "completion";

  const firstName =
    form.display_name.trim().split(" ")[0] || "there";

  const updateField = (key, value) => {
    setInlineNotice("");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSingleSelect = (stepKey, option) => {
    setInlineNotice("");
    setForm((prev) => ({ ...prev, [stepKey]: option }));
  };

  const toggleMultiSelect = (stepKey, option) => {
    setInlineNotice("");
    setForm((prev) => {
      const currentList = prev[stepKey] || [];
      const exists = currentList.includes(option);
      const nextList = exists
        ? currentList.filter((item) => item !== option)
        : [...currentList, option];
      return { ...prev, [stepKey]: nextList };
    });
  };

  const canContinue = validateStepAnswer(currentStep, form);

  const persistStepProgress = async (stepIndex, answerVal, profileUpdates) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const stepKey = QUESTION_STEPS[stepIndex].key;

    if (stepKey && answerVal !== undefined) {
      await supabase.from("onboarding_answers").upsert(
        {
          user_id: user.id,
          question_key: stepKey,
          answer: answerVal,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id, question_key" }
      );
    }

    const updatePayload = {
      user_id: user.id,
      onboarding_step: stepIndex + 1,
      ...profileUpdates,
    };

    await supabase.from("profiles").upsert(updatePayload, { onConflict: "user_id" });
  };

  const handleNextStep = useCallback(async () => {
    if (saving) return;

    if (currentStep.id === "name") {
      const err = validateDisplayName(form.display_name);
      if (err) {
        setInlineNotice(err);
        return;
      }
    }

    if (!canContinue) {
      setInlineNotice("Please answer to continue.");
      return;
    }

    setSaving(true);
    setInlineNotice("");

    try {
      let answerVal;
      let profileUpdates = {};

      switch (currentStep.id) {
        case "name": {
          const nameTrimmed = form.display_name.trim();
          answerVal = nameTrimmed;
          profileUpdates = {
            username: nameTrimmed,
            full_name: nameTrimmed,
          };
          break;
        }
        case "subjects": {
          const allSubjects = [...form.subjects];
          if (form.otherSubject && form.otherSubject.trim()) {
            const cleanOther = form.otherSubject.trim();
            if (!allSubjects.includes(cleanOther)) {
              allSubjects.push(cleanOther);
            }
          }
          answerVal = allSubjects;
          profileUpdates = { subjects: allSubjects };
          break;
        }
        case "primary_goal":
          answerVal = form.primary_goal;
          profileUpdates = { primary_goal: form.primary_goal };
          break;
        case "education_level":
          answerVal = form.education_level;
          profileUpdates = { education_level: form.education_level };
          break;
        case "learning_style":
          answerVal = form.learning_style;
          profileUpdates = { learning_style: form.learning_style };
          break;
        case "daily_time": {
          answerVal = form.daily_time;
          const weeklyHrs = mapDailyTimeToWeeklyHours(form.daily_time);
          profileUpdates = { weekly_hours: weeklyHrs };
          break;
        }
        default:
          break;
      }

      await persistStepProgress(currentStepIndex, answerVal, profileUpdates);

      if (isLastQuestion) {
        // Move to calm completion step
        setCurrentStepIndex(QUESTION_STEPS.length - 1);

        // Complete onboarding on server
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("profiles").upsert(
            {
              user_id: user.id,
              onboarding_completed: true,
              onboarding_step: QUESTION_STEPS.length,
            },
            { onConflict: "user_id" }
          );

          try {
            sessionStorage.setItem(
              `hyper-tutor-onboarding-complete:${user.id}`,
              "true"
            );
          } catch (e) {
            console.error("sessionStorage write error:", e);
          }

          window.dispatchEvent(
            new CustomEvent("hyper-tutor-onboarding-completed", {
              detail: { userId: user.id },
            })
          );
        }

        // Delay 1.8s then navigate to main app dashboard
        setTimeout(() => {
          startTransition(() => {
            navigate("/Dashboard", { replace: true });
          });
        }, 1800);
        return;
      }

      setCurrentStepIndex((prev) => prev + 1);
    } catch (err) {
      console.error("Step save error:", err);
      setInlineNotice("Could not save response. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    currentStep,
    form,
    canContinue,
    currentStepIndex,
    isLastQuestion,
    navigate,
  ]);

  const handlePrevStep = () => {
    if (currentStepIndex > 0 && !saving) {
      setInlineNotice("");
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (saving) return;
    if (isLastQuestion) {
      handleNextStep();
      return;
    }
    setInlineNotice("");
    setCurrentStepIndex((prev) => prev + 1);
  };

  // Keyboard navigation handler
  useEffect(() => {
    if (loading || isCompletionScreen) return;

    const handleKeyDown = (e) => {
      // Don't intercept if user is typing into text inputs
      const isTargetInput =
        e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA";

      if (e.key === "Enter") {
        e.preventDefault();
        if (canContinue) {
          handleNextStep();
        } else {
          setInlineNotice("Please answer to continue.");
        }
        return;
      }

      // Number key selection for option steps when not typing in text field
      if (!isTargetInput && ["single", "multiple", "multi-subject"].includes(currentStep.type)) {
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= (currentStep.options?.length || 0)) {
          e.preventDefault();
          const option = currentStep.options[num - 1];
          if (currentStep.type === "single") {
            toggleSingleSelect(currentStep.id, option);
          } else {
            toggleMultiSelect(currentStep.id, option);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    loading,
    isCompletionScreen,
    currentStep,
    canContinue,
    form,
    currentStepIndex,
    handleNextStep,
  ]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0B0D0C] text-neutral-300 p-6">
        <div className="w-5 h-5 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
      </div>
    );
  }

  // Calculate top progress line percentage
  const totalQuestionSteps = QUESTION_STEPS.length - 1; // exclude completion
  const progressPercent = isCompletionScreen
    ? 100
    : Math.round(((currentStepIndex + 1) / totalQuestionSteps) * 100);

  return (
    <div className="min-h-dvh w-full bg-[#0B0D0C] text-neutral-100 flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* Subtle Ambient Blurred Emerald Background Glow */}
      <div
        className="aria-hidden:true pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[140px] motion-safe:animate-pulse" />
        <div className="absolute -bottom-[20%] right-[10%] w-[500px] h-[500px] rounded-full bg-emerald-600/5 blur-[160px]" />
      </div>

      {/* 2px Thin Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-neutral-900 z-50">
        <div
          className="h-full bg-emerald-400 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Top Header Bar: Back Link, Skip Link & Tiny Owl Logo */}
      <header className="relative z-10 w-full max-w-2xl mx-auto px-6 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {currentStepIndex > 0 && !isCompletionScreen && (
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={saving}
              className="text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 rounded-md px-1 py-0.5"
              aria-label="Go to previous question"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
        </div>

        {/* Tiny Owl Logomark in Top Right Corner */}
        <div className="flex items-center gap-3">
          {!currentStep.required && !isCompletionScreen && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-400/50 rounded-md px-1.5 py-0.5"
            >
              Skip
            </button>
          )}
          <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center overflow-hidden">
            <img
              src="/logo3.png"
              alt="Hyper Tutor Owl"
              className="w-4 h-4 object-contain opacity-80"
            />
          </div>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="relative z-10 w-full max-w-xl mx-auto px-6 my-auto py-12 flex flex-col justify-center min-h-[60vh]">
        <div
          key={currentStep.id}
          className={`w-full transition-all duration-300 ${
            prefersReducedMotion
              ? "opacity-100"
              : "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
          }`}
        >
          {/* Personalized Greeting Badge on Steps after Name */}
          {currentStepIndex > 0 && !isCompletionScreen && (
            <p className="text-xs font-medium text-emerald-400/90 mb-3 tracking-wide">
              Nice to meet you, {firstName}.
            </p>
          )}

          {/* Question Title */}
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-neutral-100 tracking-tight leading-tight sm:leading-tight mb-3">
            {currentStep.question}
          </h1>

          {/* Muted Small Helper Line */}
          <p className="text-sm sm:text-base text-neutral-400 font-normal mb-10 leading-relaxed">
            {currentStep.helper}
          </p>

          {/* Input Types */}
          {currentStep.type === "text" && (
            <div className="space-y-4">
              <div className="relative">
                <input
                  ref={textInputRef}
                  type="text"
                  value={form.display_name}
                  onChange={(e) => updateField("display_name", e.target.value)}
                  placeholder="Your preferred name"
                  maxLength={24}
                  className="w-full bg-transparent py-3 text-xl sm:text-2xl font-semibold text-neutral-100 placeholder-neutral-600 border-b-2 border-neutral-800 focus:border-emerald-400 focus:outline-none transition-colors"
                  aria-label={currentStep.question}
                />
              </div>
            </div>
          )}

          {currentStep.type === "single" && (
            <div className="space-y-3" role="radiogroup" aria-label={currentStep.question}>
              {currentStep.options.map((option, idx) => {
                const selected = form[currentStep.id] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => toggleSingleSelect(currentStep.id, option)}
                    className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 flex items-center justify-between group ${
                      selected
                        ? "border-emerald-500/60 bg-emerald-500/10 text-neutral-100 scale-[1.01]"
                        : "border-neutral-800/80 bg-neutral-900/40 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-neutral-500 group-hover:text-neutral-400 transition-colors">
                        {idx + 1}
                      </span>
                      <span className="text-base sm:text-lg font-medium">
                        {option}
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        selected
                          ? "border-emerald-400 bg-emerald-400 text-neutral-950 scale-100 opacity-100"
                          : "border-neutral-700 bg-transparent opacity-0 scale-75"
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {currentStep.type === "multiple" && (
            <div className="space-y-3" role="group" aria-label={currentStep.question}>
              {currentStep.options.map((option, idx) => {
                const selected = (form[currentStep.id] || []).includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleMultiSelect(currentStep.id, option)}
                    className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 flex items-center justify-between group ${
                      selected
                        ? "border-emerald-500/60 bg-emerald-500/10 text-neutral-100 scale-[1.01]"
                        : "border-neutral-800/80 bg-neutral-900/40 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-neutral-500 group-hover:text-neutral-400 transition-colors">
                        {idx + 1}
                      </span>
                      <span className="text-base sm:text-lg font-medium">
                        {option}
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        selected
                          ? "border-emerald-400 bg-emerald-400 text-neutral-950 scale-100 opacity-100"
                          : "border-neutral-700 bg-transparent opacity-0 scale-75"
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {currentStep.type === "multi-subject" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2.5" role="group" aria-label={currentStep.question}>
                {currentStep.options.map((option) => {
                  const selected = (form.subjects || []).includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleMultiSelect("subjects", option)}
                      className={`px-4 py-3 rounded-xl border text-sm sm:text-base font-medium transition-all duration-200 flex items-center gap-2 ${
                        selected
                          ? "border-emerald-500/60 bg-emerald-500/15 text-neutral-100 scale-[1.02]"
                          : "border-neutral-800 bg-neutral-900/40 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900/80"
                      }`}
                    >
                      <span>{option}</span>
                      {selected && <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>

              {/* Other Subject Input Field */}
              <div className="pt-2">
                <input
                  ref={otherInputRef}
                  type="text"
                  value={form.otherSubject}
                  onChange={(e) => updateField("otherSubject", e.target.value)}
                  placeholder="Other subject (e.g. Economics, Law)"
                  maxLength={30}
                  className="w-full bg-transparent py-2.5 text-sm sm:text-base text-neutral-200 placeholder-neutral-600 border-b border-neutral-800 focus:border-emerald-400 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {currentStep.type === "completion" && (
            <div className="py-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm text-neutral-400">
                Welcome aboard, {firstName}. Your study space is tailored and ready.
              </p>
            </div>
          )}

          {/* Gentle Inline Notice */}
          {inlineNotice && (
            <p className="mt-4 text-xs font-medium text-emerald-400/90 transition-opacity">
              {inlineNotice}
            </p>
          )}
        </div>
      </main>

      {/* Bottom Actions: Understated Continue Button */}
      {!isCompletionScreen && (
        <footer className="relative z-10 w-full max-w-xl mx-auto px-6 pb-8 pt-2 flex flex-col items-center">
          <button
            type="button"
            disabled={saving || !canContinue}
            onClick={handleNextStep}
            className="group px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-200 hover:text-white font-medium text-sm transition-all duration-200 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-40 disabled:pointer-events-none"
          >
            <span>{saving ? "Saving..." : "Continue"}</span>
            <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
          </button>
          <span className="text-[11px] font-mono text-neutral-500 mt-2">
            Press Enter ↵
          </span>
        </footer>
      )}
    </div>
  );
}
