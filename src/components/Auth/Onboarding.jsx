import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, RefreshCw } from "lucide-react";
import supabase from "../../lib/supabase.js";

const validateDisplayName = (name) => {
  if (!name || !name.trim()) return "Name is required.";
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Name must be at least 2 characters.";
  if (trimmed.length > 24) return "Name must be 24 characters or less.";
  if (!/^[a-zA-Z0-9 '-]+$/.test(trimmed)) {
    return "Name can only contain letters, numbers, spaces, hyphens, and apostrophes.";
  }
  return null;
};

const QUESTION_STEPS = [
  {
    id: "greeting",
    key: "display_name",
    label: "Welcome",
    title: "What would you like to be called?",
    subtitle: "We'll use this name to personalize your tutoring experience.",
    type: "name",
  },
  {
    id: "learner_type",
    key: "learner_type",
    label: "Learner Type",
    title: "Which learner sounds most like you?",
    subtitle: "This helps Lumo tailor explanations to your pace.",
    type: "single",
    options: ["Academic achiever", "Struggling learner", "Lifelong learner"],
  },
  {
    id: "education_level",
    key: "education_level",
    label: "Education Level",
    title: "Where are you learning right now?",
    subtitle: "We'll align study materials to your academic stage.",
    type: "single",
    options: ["High school", "College / university", "Working professional", "Independent learner"],
  },
  {
    id: "primary_goal",
    key: "primary_goal",
    label: "Primary Goal",
    title: "What is your primary goal?",
    subtitle: "Select the goal you want to focus on first.",
    type: "single",
    options: ["Improve my grades", "Prepare for an exam", "Learn a new skill", "Advance my career"],
  },
  {
    id: "subjects",
    key: "subjects",
    label: "Study Subjects",
    title: "What would you like to study?",
    subtitle: "Choose all topics that apply to your schedule.",
    type: "multiple",
    options: ["Math", "Science", "Languages", "Computer science", "Business", "Arts", "Exam prep"],
  },
  {
    id: "weekly_hours",
    key: "weekly_hours",
    label: "Weekly Rhythm",
    title: "How many hours can you study each week?",
    subtitle: "Be realistic — consistency beats intensity.",
    type: "number",
    min: 1,
    max: 80,
  },
  {
    id: "study_days",
    key: "study_days",
    label: "Study Schedule",
    title: "Which days work best for you?",
    subtitle: "Select the days you plan to be active.",
    type: "multiple",
    options: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  {
    id: "preferred_time",
    key: "preferred_time",
    label: "Focus Window",
    title: "When do you focus best?",
    subtitle: "We'll schedule reminders during your peak productivity hours.",
    type: "single",
    options: ["Morning", "Afternoon", "Evening", "Flexible"],
  },
  {
    id: "learning_style",
    key: "learning_style",
    label: "Learning Style",
    title: "How do you learn best?",
    subtitle: "Choose the method that makes concepts click fastest.",
    type: "single",
    options: ["Visual", "Practice first", "Step-by-step", "Conversation"],
  },
  {
    id: "accessibility_needs",
    key: "accessibility_needs",
    label: "Accessibility",
    title: "Would any accessibility support help?",
    subtitle: "Select any features you want enabled by default.",
    type: "multiple",
    options: ["Screen reader", "Text-to-speech", "High contrast", "Larger text", "None"],
  },
  {
    id: "collaboration_interest",
    key: "collaboration_interest",
    label: "Community",
    title: "How would you like to learn with others?",
    subtitle: "You can change your community settings anytime.",
    type: "single",
    options: ["Keep me focused", "Find study groups", "Peer support", "Just me for now"],
  },
  {
    id: "summary",
    key: "summary",
    label: "Your Plan",
    title: "Your personalized study setup is ready",
    subtitle: "Here is how Hyper Tutor will tailor your learning path.",
    type: "summary",
  },
];

const initialForm = {
  displayName: "",
  learnerType: "",
  educationLevel: "",
  primaryGoal: "",
  subjects: [],
  weeklyHours: 5,
  studyDays: [],
  preferredTime: "",
  learningStyle: "",
  accessibilityNeeds: [],
  collaborationInterest: "",
};

export default function Onboarding({ session: _session }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [firstName, setFirstName] = useState("");
  const [nameError, setNameError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [owlState, setOwlState] = useState("normal"); // 'normal' | 'blink' | 'nod' | 'celebrate'

  const inputRef = useRef(null);

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

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) navigate("/login", { replace: true });
          return;
        }

        // Derive initial first name from auth metadata
        const rawName =
          user.user_metadata?.full_name ||
          user.user_metadata?.userName ||
          user.email?.split("@")[0] ||
          "Learner";
        const derivedFirstName = rawName.trim().split(" ")[0] || "Learner";
        if (mounted) {
          setFirstName(derivedFirstName);
        }

        // Fetch user profile and stored answers
        const [{ data: profile }, { data: savedAnswers }] = await Promise.all([
          supabase
            .from("profiles")
            .select("username, full_name, learner_type, education_level, primary_goal, subjects, weekly_hours, study_days, preferred_time, learning_style, accessibility_needs, collaboration_interest, onboarding_step, onboarding_completed")
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

        // Merge saved answers into form
        const updatedForm = { ...initialForm };
        const initialDisplayName = profile?.username || profile?.full_name || derivedFirstName;
        updatedForm.displayName = initialDisplayName;

        if (profile?.learner_type) updatedForm.learnerType = profile.learner_type;
        if (profile?.education_level) updatedForm.educationLevel = profile.education_level;
        if (profile?.primary_goal) updatedForm.primaryGoal = profile.primary_goal;
        if (Array.isArray(profile?.subjects) && profile.subjects.length) updatedForm.subjects = profile.subjects;
        if (profile?.weekly_hours) updatedForm.weeklyHours = profile.weekly_hours;
        if (Array.isArray(profile?.study_days) && profile.study_days.length) updatedForm.studyDays = profile.study_days;
        if (profile?.preferred_time) updatedForm.preferredTime = profile.preferred_time;
        if (profile?.learning_style) updatedForm.learningStyle = profile.learning_style;
        if (Array.isArray(profile?.accessibility_needs) && profile.accessibility_needs.length) updatedForm.accessibilityNeeds = profile.accessibility_needs;
        if (profile?.collaboration_interest) updatedForm.collaborationInterest = profile.collaboration_interest;

        if (savedAnswers && savedAnswers.length > 0) {
          savedAnswers.forEach((item) => {
            if (item.question_key === "display_name" && item.answer) updatedForm.displayName = item.answer;
            if (item.question_key === "learner_type" && item.answer) updatedForm.learnerType = item.answer;
            if (item.question_key === "education_level" && item.answer) updatedForm.educationLevel = item.answer;
            if (item.question_key === "primary_goal" && item.answer) updatedForm.primaryGoal = item.answer;
            if (item.question_key === "subjects" && Array.isArray(item.answer)) updatedForm.subjects = item.answer;
            if (item.question_key === "weekly_hours" && item.answer) updatedForm.weeklyHours = Number(item.answer);
            if (item.question_key === "study_days" && Array.isArray(item.answer)) updatedForm.studyDays = item.answer;
            if (item.question_key === "preferred_time" && item.answer) updatedForm.preferredTime = item.answer;
            if (item.question_key === "learning_style" && item.answer) updatedForm.learningStyle = item.answer;
            if (item.question_key === "accessibility_needs" && Array.isArray(item.answer)) updatedForm.accessibilityNeeds = item.answer;
            if (item.question_key === "collaboration_interest" && item.answer) updatedForm.collaborationInterest = item.answer;
          });
        }

        setForm(updatedForm);

        // Resume at first incomplete step
        const savedStepIndex = typeof profile?.onboarding_step === "number" ? profile.onboarding_step : 0;
        const clampedStep = Math.min(Math.max(0, savedStepIndex), QUESTION_STEPS.length - 1);
        setCurrentStep(clampedStep);
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

  // Trigger brief owl mascot reaction on step changes
  useEffect(() => {
    if (loading) return;
    if (currentStep === QUESTION_STEPS.length - 1) {
      setOwlState("celebrate");
    } else {
      setOwlState("nod");
      const t = setTimeout(() => setOwlState("normal"), 800);
      return () => clearTimeout(t);
    }
  }, [currentStep, loading]);

  const triggerOwlBlink = () => {
    setOwlState("blink");
    setTimeout(() => setOwlState("normal"), 400);
  };

  const updateField = (key, value) => {
    triggerOwlBlink();
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMultiple = (key, option) => {
    triggerOwlBlink();
    setForm((prev) => {
      const currentArr = prev[key] || [];
      if (option === "None") {
        return { ...prev, [key]: ["None"] };
      }
      const filtered = currentArr.filter((item) => item !== "None");
      const exists = filtered.includes(option);
      const nextArr = exists ? filtered.filter((i) => i !== option) : [...filtered, option];
      return { ...prev, [key]: nextArr };
    });
  };

  const currentStepData = QUESTION_STEPS[currentStep];

  const canProceed = () => {
    switch (currentStepData.id) {
      case "greeting":
        return !validateDisplayName(form.displayName);
      case "learner_type":
        return Boolean(form.learnerType);
      case "education_level":
        return Boolean(form.educationLevel);
      case "primary_goal":
        return Boolean(form.primaryGoal);
      case "subjects":
        return Array.isArray(form.subjects) && form.subjects.length > 0;
      case "weekly_hours":
        return Number(form.weeklyHours) >= 1 && Number(form.weeklyHours) <= 80;
      case "study_days":
        return Array.isArray(form.studyDays) && form.studyDays.length > 0;
      case "preferred_time":
        return Boolean(form.preferredTime);
      case "learning_style":
        return Boolean(form.learningStyle);
      case "accessibility_needs":
        return Array.isArray(form.accessibilityNeeds) && form.accessibilityNeeds.length > 0;
      case "collaboration_interest":
        return Boolean(form.collaborationInterest);
      case "summary":
        return true;
      default:
        return false;
    }
  };

  const persistStepProgress = async (stepIndex, answerVal, profileUpdates) => {
    const { data: { user } } = await supabase.auth.getUser();
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

  const handleNextStep = async () => {
    setGeneralError("");
    setNameError("");

    if (currentStepData.id === "greeting") {
      const err = validateDisplayName(form.displayName);
      if (err) {
        setNameError(err);
        return;
      }
    }

    if (!canProceed()) {
      setGeneralError("Please select or fill in an answer to continue.");
      return;
    }

    setSaving(true);
    try {
      let answerVal;
      let profileUpdates = {};

      switch (currentStepData.id) {
        case "greeting":
          answerVal = form.displayName.trim();
          profileUpdates = {
            username: form.displayName.trim(),
            full_name: form.displayName.trim(),
          };
          break;
        case "learner_type":
          answerVal = form.learnerType;
          profileUpdates = { learner_type: form.learnerType };
          break;
        case "education_level":
          answerVal = form.educationLevel;
          profileUpdates = { education_level: form.educationLevel };
          break;
        case "primary_goal":
          answerVal = form.primaryGoal;
          profileUpdates = { primary_goal: form.primaryGoal };
          break;
        case "subjects":
          answerVal = form.subjects;
          profileUpdates = { subjects: form.subjects };
          break;
        case "weekly_hours":
          answerVal = Number(form.weeklyHours);
          profileUpdates = { weekly_hours: Number(form.weeklyHours) };
          break;
        case "study_days":
          answerVal = form.studyDays;
          profileUpdates = { study_days: form.studyDays };
          break;
        case "preferred_time":
          answerVal = form.preferredTime;
          profileUpdates = { preferred_time: form.preferredTime };
          break;
        case "learning_style":
          answerVal = form.learningStyle;
          profileUpdates = { learning_style: form.learningStyle };
          break;
        case "accessibility_needs":
          answerVal = form.accessibilityNeeds;
          profileUpdates = { accessibility_needs: form.accessibilityNeeds };
          break;
        case "collaboration_interest":
          answerVal = form.collaborationInterest;
          profileUpdates = { collaboration_interest: form.collaborationInterest };
          break;
        default:
          break;
      }

      await persistStepProgress(currentStep, answerVal, profileUpdates);

      if (currentStep === QUESTION_STEPS.length - 1) {
        const { data: { user } } = await supabase.auth.getUser();
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
            sessionStorage.setItem(`hyper-tutor-onboarding-complete:${user.id}`, "true");
          } catch (e) {
            console.error("sessionStorage write error:", e);
          }

          window.dispatchEvent(
            new CustomEvent("hyper-tutor-onboarding-completed", {
              detail: { userId: user.id },
            })
          );
        }
        navigate("/Dashboard", { replace: true });
        return;
      }

      setCurrentStep((prev) => prev + 1);
    } catch (err) {
      console.error("Step save error:", err);
      setGeneralError("Could not save progress. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0 && !saving) {
      setGeneralError("");
      setNameError("");
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-950 text-slate-100 p-6">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Setting up your onboarding experience...</p>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(((currentStep + 1) / QUESTION_STEPS.length) * 100);

  return (
    <div className="min-h-dvh w-full bg-[#18211F] text-slate-100 flex flex-col justify-between p-4 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] overflow-hidden select-none">
      {/* Top Bar: Progress & Mascot */}
      <header className="w-full max-w-xl mx-auto flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={saving}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors disabled:opacity-50"
              aria-label="Previous step"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <span className="text-xs font-semibold text-slate-400">
            Step {currentStep + 1} of {QUESTION_STEPS.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 max-w-[160px] sm:max-w-[200px] h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Small Mascot Header Icon */}
        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center overflow-hidden">
          <img
            src="/logo3.png"
            alt="Owl Mascot"
            className={`w-6 h-6 object-contain ${
              owlState === "blink" ? "scale-90 opacity-80" : owlState === "nod" ? "translate-y-0.5" : ""
            }`}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-xl mx-auto flex-1 flex flex-col justify-center py-2">
        <div
          className={`w-full transition-all duration-300 ${
            prefersReducedMotion ? "" : "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4"
          }`}
          key={currentStepData.id}
        >
          {/* Owl Banner Card */}
          <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <img
                src="/logo3.png"
                alt="Hyper Tutor Owl Mascot"
                className={`w-10 h-10 object-contain ${
                  owlState === "celebrate"
                    ? "animate-bounce"
                    : owlState === "nod"
                    ? "animate-pulse"
                    : ""
                }`}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                {currentStepData.label}
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                {currentStepData.id === "greeting" && firstName
                  ? `Welcome, ${firstName}!`
                  : currentStepData.title}
              </h2>
            </div>
          </div>

          {/* Step Subtitle / Question Prompt */}
          <p className="text-sm sm:text-base text-slate-300 mb-6 font-medium leading-relaxed">
            {currentStepData.id === "greeting"
              ? "What would you like to be called?"
              : currentStepData.subtitle}
          </p>

          {/* Interactive Question Inputs */}
          {currentStepData.type === "name" && (
            <div className="space-y-3">
              <input
                ref={inputRef}
                type="text"
                value={form.displayName}
                onChange={(e) => {
                  setNameError("");
                  updateField("displayName", e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleNextStep();
                  }
                }}
                placeholder="Enter your preferred name"
                className="w-full px-4 py-3.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 text-base font-semibold focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                maxLength={24}
              />
              {nameError && (
                <p className="text-xs font-semibold text-red-400 bg-red-950/40 p-2.5 rounded-xl border border-red-800/40">
                  {nameError}
                </p>
              )}
            </div>
          )}

          {currentStepData.type === "single" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentStepData.options.map((option) => {
                const selected = form[currentStepData.id] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateField(currentStepData.id, option)}
                    className={`min-h-[52px] px-4 py-3 rounded-2xl border text-left text-sm font-semibold flex items-center justify-between transition-all ${
                      selected
                        ? "border-emerald-400 bg-emerald-500/20 text-white shadow-lg shadow-emerald-500/5"
                        : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <span>{option}</span>
                    <span
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        selected
                          ? "border-emerald-400 bg-emerald-400 text-slate-950"
                          : "border-slate-700 bg-slate-800"
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {currentStepData.type === "multiple" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentStepData.options.map((option) => {
                const selected = (form[currentStepData.id] || []).includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleMultiple(currentStepData.id, option)}
                    className={`min-h-[52px] px-4 py-3 rounded-2xl border text-left text-sm font-semibold flex items-center justify-between transition-all ${
                      selected
                        ? "border-emerald-400 bg-emerald-500/20 text-white shadow-lg shadow-emerald-500/5"
                        : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <span>{option}</span>
                    <span
                      className={`w-5 h-5 rounded-xl border flex items-center justify-center ${
                        selected
                          ? "border-emerald-400 bg-emerald-400 text-slate-950"
                          : "border-slate-700 bg-slate-800"
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {currentStepData.type === "number" && (
            <div className="space-y-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-300">Target Study Hours / Week</label>
                <span className="text-2xl font-black text-emerald-400">{form.weeklyHours} hrs</span>
              </div>
              <input
                type="range"
                min="1"
                max="40"
                value={form.weeklyHours}
                onChange={(e) => updateField("weeklyHours", Number(e.target.value))}
                className="w-full accent-emerald-400 bg-slate-800 rounded-lg cursor-pointer h-2"
              />
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>1 hr</span>
                <span>20 hrs</span>
                <span>40 hrs</span>
              </div>
            </div>
          )}

          {currentStepData.type === "summary" && (
            <div className="space-y-3 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl text-xs sm:text-sm">
              <p className="font-semibold text-emerald-400 mb-2">
                Nice to meet you, {form.displayName}! Here is your tailored plan:
              </p>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Learner Type</span>
                  <span className="font-semibold text-white">{form.learnerType || "General"}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Goal</span>
                  <span className="font-semibold text-white">{form.primaryGoal || "Improvement"}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Weekly Target</span>
                  <span className="font-semibold text-white">{form.weeklyHours} hours/week</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Focus Window</span>
                  <span className="font-semibold text-white">{form.preferredTime || "Flexible"}</span>
                </div>
              </div>
              {form.subjects.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Key Subjects</span>
                  <div className="flex flex-wrap gap-1.5">
                    {form.subjects.map((sub) => (
                      <span key={sub} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-xs font-medium">
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {generalError && (
            <p className="mt-4 text-xs font-semibold text-red-400 bg-red-950/40 p-2.5 rounded-xl border border-red-800/40">
              {generalError}
            </p>
          )}
        </div>
      </main>

      {/* Footer / Primary Action Button */}
      <footer className="w-full max-w-xl mx-auto pt-2">
        <button
          type="button"
          disabled={saving}
          onClick={handleNextStep}
          className="w-full min-h-[52px] bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 text-slate-950 font-bold py-3.5 px-6 rounded-2xl transition-all text-base shadow-lg shadow-emerald-400/10 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" /> Saving...
            </>
          ) : currentStep === QUESTION_STEPS.length - 1 ? (
            "Take me to my dashboard"
          ) : (
            <>
              Continue <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
