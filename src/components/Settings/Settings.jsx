import { useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useProfile } from "../../app/ProfileContext";
import supabase from "../../lib/supabase.js";

const STORAGE_BUCKET = "user-images";
const levels = ["9th Grade", "10th Grade", "11th Grade", "12th Grade", "College Freshman", "College Student", "Professional"];
const generalSubjects = ["Mathematics", "Science", "English", "History", "Computer Science", "Languages", "Business", "Arts"];
const schoolSubjects = ["AP Biology", "AP Chemistry", "AP Physics", "AP Calculus", "Common Core Algebra II", "Geometry", "Statistics"];
const styles = ["Visual", "Step-by-step", "Analogy-based"];
const behaviors = ["Always Guide First", "Hints Then Answer", "Direct Help"];
const accessibilityOptions = ["Screen Reader", "Text-to-speech", "High Contrast", "Larger Text", "None"];
const defaultSettings = { studentLevel: "", subject: "", currentTopic: "", curriculumStandard: "None/General", learningStyle: "Step-by-step", knowledgeGaps: [], socraticStrictness: "Always Guide First", accessibilityNeeds: [], language: "English", reducedMotion: false };

function Section({ title, description, children, open, onToggle }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left hover:bg-slate-50"><span><h2 className="text-lg font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></span><ChevronDown className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} size={20} /></button>{open && <div className="border-t border-slate-100 p-6">{children}</div>}</section>;
}

function SelectField({ label, value, onChange, options }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"><option value="">Choose {label.toLowerCase()}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function ChoiceRow({ options, value, onChange }) {
  return <div className="grid gap-2 sm:grid-cols-3">{options.map((option) => <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${value === option ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:border-emerald-300"}`}>{option}</button>)}</div>;
}

function Settings() {
  const { profile, refreshProfile } = useProfile();
  const fileInputRef = useRef(null);
  const [settings, setSettings] = useState({ ...defaultSettings, studentLevel: profile?.education_level || "", subject: profile?.settings_subject || profile?.subjects?.[0] || "", currentTopic: profile?.current_topic || "", curriculumStandard: profile?.curriculum_standard || "None/General", learningStyle: profile?.learning_style || defaultSettings.learningStyle, knowledgeGaps: profile?.knowledge_gaps || [], socraticStrictness: profile?.socratic_strictness || defaultSettings.socraticStrictness, accessibilityNeeds: profile?.accessibility_needs || [], language: profile?.language || "English", reducedMotion: profile?.reduced_motion || false });
  const [openSections, setOpenSections] = useState([true, true, true, true]);
  const [gapInput, setGapInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) return;
    setSettings({
      ...defaultSettings,
      studentLevel: profile.education_level || "",
      subject: profile.settings_subject || profile.subjects?.[0] || "",
      currentTopic: profile.current_topic || "",
      curriculumStandard: profile.curriculum_standard || "None/General",
      learningStyle: profile.learning_style || defaultSettings.learningStyle,
      knowledgeGaps: profile.knowledge_gaps || [],
      socraticStrictness: profile.socratic_strictness || defaultSettings.socraticStrictness,
      accessibilityNeeds: profile.accessibility_needs || [],
      language: profile.language || "English",
      reducedMotion: profile.reduced_motion || false,
    });
  }, [profile]);

  const update = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const toggleSection = (index) => setOpenSections((current) => current.map((open, item) => item === index ? !open : open));
  const addGap = () => { const gap = gapInput.trim(); if (gap && !settings.knowledgeGaps.includes(gap)) update("knowledgeGaps", [...settings.knowledgeGaps, gap]); setGapInput(""); };
  const chooseFile = (event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { setError("Choose An Image Smaller Than 5 MB."); return; } setSelectedFile(file); setPreview(URL.createObjectURL(file)); setError(""); };

  const save = async () => {
    setIsSaving(true); setError(""); setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Your Session Has Expired. Please Sign In Again."); setIsSaving(false); return; }
    let userImg = profile?.user_img;
    if (selectedFile) {
      const extension = selectedFile.name.split(".").pop();
      userImg = `${user.id}/profile-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(userImg, selectedFile);
      if (uploadError) { setError(uploadError.message); setIsSaving(false); return; }
    }
    const payload = { education_level: settings.studentLevel, settings_subject: settings.subject, current_topic: settings.currentTopic.trim(), curriculum_standard: settings.curriculumStandard, learning_style: settings.learningStyle, knowledge_gaps: settings.knowledgeGaps, socratic_strictness: settings.socraticStrictness, accessibility_needs: settings.accessibilityNeeds, language: settings.language, reduced_motion: settings.reducedMotion, ...(selectedFile ? { user_img: userImg } : {}) };
    const { error: saveError } = await supabase.from("profiles").update(payload).eq("user_id", user.id);
    if (saveError) { if (selectedFile) await supabase.storage.from(STORAGE_BUCKET).remove([userImg]); setError(saveError.message); setIsSaving(false); return; }
    await refreshProfile(); setSelectedFile(null); setMessage("Settings Saved Successfully."); setIsSaving(false);
  };

  const image = preview || profile?.avatar_url;
  const name = profile?.full_name || profile?.username || "Learner";
  const subjectOptions = settings.studentLevel.includes("Grade") ? [...generalSubjects, ...schoolSubjects] : generalSubjects;
  const fieldClass = "rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

  return <main className="min-h-screen bg-slate-50 px-5 pb-14 pt-20 text-slate-900 md:px-10"><div className="mx-auto max-w-4xl"><header className="mb-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Hyper Tutor</p><h1 className="mt-2 text-3xl font-bold">Settings</h1><p className="mt-2 text-slate-500">Tune Your Tutor, Curriculum, And Learning Experience.</p></header><div className="space-y-4">
    <Section title="Profile & Curriculum" description="Tell Hyper Tutor What You Are Learning And Where You Are Starting." open={openSections[0]} onToggle={() => toggleSection(0)}><div className="grid gap-5 md:grid-cols-2"><SelectField label="Student Level" value={settings.studentLevel} onChange={(value) => update("studentLevel", value)} options={levels} /><SelectField label="Subject" value={settings.subject} onChange={(value) => update("subject", value)} options={subjectOptions} /><label className="block text-sm font-semibold text-slate-700">Current Topic<input value={settings.currentTopic} onChange={(event) => update("currentTopic", event.target.value)} placeholder="E.g. Cell Division" className={`mt-2 w-full ${fieldClass}`} /></label><SelectField label="Curriculum Standard" value={settings.curriculumStandard} onChange={(value) => update("curriculumStandard", value)} options={["AP Biology", "Common Core Algebra II", "IB Math SL", "None/General"]} /></div><div className="mt-5"><p className="mb-3 text-sm font-semibold text-slate-700">Learning Style</p><ChoiceRow options={styles} value={settings.learningStyle} onChange={(value) => update("learningStyle", value)} /></div></Section>
    <Section title="Knowledge Gaps" description="Keep Track Of Concepts That Need More Practice." open={openSections[1]} onToggle={() => toggleSection(1)}><div className="flex gap-2"><input value={gapInput} onChange={(event) => setGapInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addGap())} placeholder="Add A Knowledge Gap" className={`min-w-0 flex-1 ${fieldClass}`} /><button type="button" onClick={addGap} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"><Plus size={17} /> Add</button></div><div className="mt-4 flex flex-wrap gap-2">{settings.knowledgeGaps.length ? settings.knowledgeGaps.map((gap) => <span key={gap} className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">{gap}<button type="button" onClick={() => update("knowledgeGaps", settings.knowledgeGaps.filter((item) => item !== gap))} title={`Remove ${gap}`}><Trash2 size={14} /></button></span>) : <p className="text-sm text-slate-500">No Knowledge Gaps Added Yet.</p>}</div><button type="button" onClick={() => { if (window.confirm("Reset Your Knowledge Gap Diagnosis?")) update("knowledgeGaps", []); }} className="mt-6 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Reset Diagnosis</button></Section>
    <Section title="Tutoring Behavior" description="Choose How The AI Tutor Guides You Through Difficult Problems." open={openSections[2]} onToggle={() => toggleSection(2)}><p className="mb-3 text-sm font-semibold text-slate-700">Socratic Strictness</p><ChoiceRow options={behaviors} value={settings.socraticStrictness} onChange={(value) => update("socraticStrictness", value)} /><p className="mt-3 text-xs text-slate-500">This Preference Controls Whether The Tutor Guides, Hints, Or Answers Directly.</p></Section>
    <Section title="Accessibility & Experience" description="Make Hyper Tutor More Comfortable And Useful For You." open={openSections[3]} onToggle={() => toggleSection(3)}><div><p className="mb-3 text-sm font-semibold text-slate-700">Accessibility Support</p><div className="grid gap-2 sm:grid-cols-2">{accessibilityOptions.map((option) => { const selected = settings.accessibilityNeeds.includes(option); return <button type="button" key={option} onClick={() => update("accessibilityNeeds", selected ? settings.accessibilityNeeds.filter((item) => item !== option) : [...settings.accessibilityNeeds.filter((item) => item !== "None"), option])} className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold ${selected ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600"}`}>{option}</button>; })}</div></div><div className="mt-5 grid gap-5 md:grid-cols-2"><SelectField label="Language" value={settings.language} onChange={(value) => update("language", value)} options={["English", "Spanish", "French", "German"]} /><label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-700"><input type="checkbox" checked={settings.reducedMotion} onChange={(event) => update("reducedMotion", event.target.checked)} className="h-4 w-4 accent-emerald-600" /> Reduce Motion</label></div><div className="mt-7 flex flex-col gap-5 border-t border-slate-100 pt-6 sm:flex-row sm:items-center"><button type="button" onClick={() => fileInputRef.current?.click()} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-emerald-100 text-emerald-800">{image ? <img src={image} alt={`${name} profile`} className="h-full w-full object-cover" /> : <span className="text-2xl font-bold">{name.charAt(0).toUpperCase()}</span>}<span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100"><Camera size={20} /></span></button><div><p className="font-semibold">Profile Picture</p><button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Choose Image</button><input ref={fileInputRef} type="file" accept="image/*" onChange={chooseFile} className="hidden" /></div></div></Section>
  </div>{error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{message && <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}<button type="button" onClick={save} disabled={isSaving} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} {isSaving ? "Saving..." : "Save All Settings"}</button></div></main>;
}

export default Settings;
