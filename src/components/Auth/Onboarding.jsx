import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import supabase from "../../lib/supabase.js";

const steps = [
  { label: "About you", title: "Let’s make Hyper Tutor yours" },
  { label: "Your goals", title: "What are you working toward?" },
  { label: "Your rhythm", title: "Build a routine you can keep" },
  { label: "Your preferences", title: "Shape the way you learn" },
];

const initialForm = {
  fullName: "",
  learnerType: "",
  educationLevel: "",
  primaryGoal: "",
  subjects: [],
  weeklyHours: "5",
  studyDays: [],
  preferredTime: "",
  learningStyle: "",
  accessibilityNeeds: [],
  collaborationInterest: "",
};

const subjectOptions = ["Math", "Science", "Languages", "Computer science", "Business", "Arts", "Exam prep"];
const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const accessibilityOptions = ["Screen reader", "Text-to-speech", "High contrast", "Larger text", "None"];

function ChoiceGroup({ options, value, onChange, multiple = false }) {
  const toggle = (option) => {
    if (!multiple) {
      onChange(option);
      return;
    }
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((option) => {
        const selected = multiple ? value.includes(option) : value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={`rounded-xl border px-3 py-3 text-left text-sm transition ${selected ? "border-emerald-400 bg-emerald-400/15 text-white" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-emerald-400/50"}`}
          >
            <span className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full border ${selected ? "border-emerald-300 bg-emerald-300 text-slate-950" : "border-slate-500"}`}>
              {selected && <Check size={11} strokeWidth={3} />}
            </span>
            {option}
          </button>
        );
      })}
    </div>
  );
}

function Onboarding({ session }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const canContinue = () => {
    if (step === 0) return form.fullName.trim() && form.learnerType && form.educationLevel;
    if (step === 1) return form.primaryGoal && form.subjects.length;
    if (step === 2) return form.weeklyHours && form.studyDays.length && form.preferredTime;
    return form.learningStyle && form.collaborationInterest && form.accessibilityNeeds.length;
  };

  const saveProfile = async () => {
    setSaving(true);
    setError("");
    const user = session?.user;
    if (!user) return;

    const profile = {
      user_id: user.id,
      username: user.user_metadata?.userName || user.user_metadata?.username || user.email?.split("@")[0] || "Learner",
      full_name: form.fullName.trim(),
      learner_type: form.learnerType,
      education_level: form.educationLevel,
      primary_goal: form.primaryGoal,
      subjects: form.subjects,
      weekly_hours: Number(form.weeklyHours),
      study_days: form.studyDays,
      preferred_time: form.preferredTime,
      learning_style: form.learningStyle,
      accessibility_needs: form.accessibilityNeeds,
      collaboration_interest: form.collaborationInterest,
      onboarding_completed: true,
    };

    const [{ error: profileError }, { error: metadataError }] = await Promise.all([
      supabase.from("profiles").upsert(profile, { onConflict: "user_id" }),
      supabase.auth.updateUser({ data: { ...profile, username: profile.username } }),
    ]);

    if (profileError || metadataError) {
      setError(profileError?.message || metadataError?.message || "We could not save your preferences.");
      setSaving(false);
      return;
    }

    navigate("/Dashboard", { replace: true });
  };

  const next = () => {
    if (!canContinue()) {
      setError("Choose an answer for each required field before continuing.");
      return;
    }
    setError("");
    if (step === steps.length - 1) saveProfile();
    else setStep((current) => current + 1);
  };

  return (
    <main className="min-h-screen bg-[#071512] px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-center">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-400/15 p-2 text-emerald-300"><Sparkles size={20} /></div><span className="font-semibold tracking-tight">Hyper Tutor</span></div>
          <span className="text-sm text-slate-400">Step {step + 1} of {steps.length}</span>
        </div>

        <div className="mb-8 flex gap-2">{steps.map((item, index) => <div key={item.label} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-emerald-400" : "bg-white/10"}`} />)}</div>

        <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-emerald-950/20 sm:p-10">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-emerald-300">{steps[step].label}</p>
          <h1 className="mb-8 text-3xl font-semibold tracking-tight sm:text-4xl">{steps[step].title}</h1>

          {step === 0 && <div className="space-y-6"><label className="block text-sm text-slate-300">What should we call you? *<input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} placeholder="Your name" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-emerald-400" /></label><div><p className="mb-3 text-sm text-slate-300">Which learner sounds most like you? *</p><ChoiceGroup options={["Academic achiever", "Struggling learner", "Lifelong learner"]} value={form.learnerType} onChange={(value) => update("learnerType", value)} /></div><div><p className="mb-3 text-sm text-slate-300">Where are you learning right now? *</p><ChoiceGroup options={["High school", "College / university", "Working professional", "Independent learner"]} value={form.educationLevel} onChange={(value) => update("educationLevel", value)} /></div></div>}
          {step === 1 && <div className="space-y-6"><div><p className="mb-3 text-sm text-slate-300">What is your primary goal? *</p><ChoiceGroup options={["Improve my grades", "Prepare for an exam", "Learn a new skill", "Advance my career"]} value={form.primaryGoal} onChange={(value) => update("primaryGoal", value)} /></div><div><p className="mb-3 text-sm text-slate-300">What would you like to study? Choose all that apply. *</p><ChoiceGroup options={subjectOptions} value={form.subjects} onChange={(value) => update("subjects", value)} multiple /></div></div>}
          {step === 2 && <div className="space-y-6"><label className="block text-sm text-slate-300">How many hours can you study each week? *<input type="number" min="1" max="80" value={form.weeklyHours} onChange={(event) => update("weeklyHours", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-emerald-400" /></label><div><p className="mb-3 text-sm text-slate-300">Which days work best? *</p><ChoiceGroup options={dayOptions} value={form.studyDays} onChange={(value) => update("studyDays", value)} multiple /></div><div><p className="mb-3 text-sm text-slate-300">When do you focus best? *</p><ChoiceGroup options={["Morning", "Afternoon", "Evening", "Flexible"]} value={form.preferredTime} onChange={(value) => update("preferredTime", value)} /></div></div>}
          {step === 3 && <div className="space-y-6"><div><p className="mb-3 text-sm text-slate-300">How do you learn best? *</p><ChoiceGroup options={["Visual", "Practice first", "Step-by-step", "Conversation"]} value={form.learningStyle} onChange={(value) => update("learningStyle", value)} /></div><div><p className="mb-3 text-sm text-slate-300">Would any accessibility support help? *</p><ChoiceGroup options={accessibilityOptions} value={form.accessibilityNeeds} onChange={(value) => update("accessibilityNeeds", value)} multiple /></div><div><p className="mb-3 text-sm text-slate-300">How would you like to learn with others? *</p><ChoiceGroup options={["Keep me focused", "Find study groups", "Peer support", "Just me for now"]} value={form.collaborationInterest} onChange={(value) => update("collaborationInterest", value)} /></div></div>}

          {error && <p className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
          <div className="mt-10 flex items-center justify-between gap-4"><button type="button" disabled={step === 0 || saving} onClick={() => { setError(""); setStep((current) => current - 1); }} className="inline-flex items-center gap-2 px-2 py-3 text-sm text-slate-400 hover:text-white disabled:invisible"><ArrowLeft size={17} /> Back</button><button type="button" disabled={saving} onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60">{saving ? "Saving..." : step === steps.length - 1 ? "Start learning" : "Continue"}{!saving && (step === steps.length - 1 ? <Check size={17} /> : <ArrowRight size={17} />)}</button></div>
        </section>
        <p className="mt-5 text-center text-xs text-slate-500">Your answers personalize your planner, tutor, study tools, and community recommendations.</p>
      </div>
    </main>
  );
}

export default Onboarding;
