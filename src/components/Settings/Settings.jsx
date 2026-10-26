import { useEffect, useRef, useState } from "react";
import { Bell, Camera, ChevronDown, Loader2, Plus, Save, Send, ShieldAlert, Smartphone, Trash2 } from "lucide-react";
import { useProfile } from "../../app/ProfileContext";
import supabase from "../../lib/supabase.js";
import Billing from "./Billing";
import SocraticStrictness from "./SocraticStrictness";
import NotificationSettings from "./NotificationSettings";
import PageContainer from "../common/PageContainer";
import {
  getNotificationPreferences,
  persistNotificationPreferences,
  recordNotification,
} from "../../lib/notifications";
import { hasAccessibilityNeed } from "../../lib/accessibility.js";
import { getSubjectOptions } from "../../lib/userSubjects.js";

const STORAGE_BUCKET = "user-images";
const levels = ["High school", "College / university", "Working professional", "Independent learner", "9th Grade", "10th Grade", "11th Grade", "12th Grade", "College Freshman", "College Student", "Professional"];
const primaryGoalOptions = ["Improve my grades", "Prepare for an exam", "Learn a new skill", "Advance my career"];
const learnerTypeOptions = ["Academic achiever", "Struggling learner", "Lifelong learner"];
const styles = ["Explanations", "Practice questions", "Examples", "Quizzes", "Step-by-step"];
const accessibilityOptions = ["Screen reader", "Text-to-speech", "High contrast", "Larger text", "None"];
const collaborationOptions = ["Keep me focused", "Find study groups", "Peer support", "Just me for now"];
const preferredTimeOptions = ["Morning", "Afternoon", "Evening", "Flexible"];
const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const defaultSettings = { primaryGoal: "Improve my grades", learnerType: "Academic achiever", studentLevel: "", subject: "", currentTopic: "", curriculumStandard: "None/General", learningStyle: "Step-by-step", knowledgeGaps: [], accessibilityNeeds: [], language: "English", reducedMotion: false, collaborationInterest: "Just me for now", preferredTime: "Flexible", studyDays: [], weeklyHours: 5 };

function resolveLearningStyleFromProfile(profileStyle) {
  if (Array.isArray(profileStyle) && profileStyle.length > 0) {
    return profileStyle[0];
  }
  if (typeof profileStyle === "string" && profileStyle.trim()) {
    return profileStyle.trim();
  }
  return defaultSettings.learningStyle;
}

function Section({ title, description, children, open, onToggle }) {
  return <section className="settings-section"><button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 text-left"><span><h2 className="text-xl font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></span><ChevronDown className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} size={20} /></button>{open && <div className="mt-7">{children}</div>}</section>;
}

function SelectField({ label, value, onChange, options }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="settings-field mt-2 w-full"><option value="">Choose {label.toLowerCase()}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function ChoiceRow({ options, value, onChange }) {
  return <div className="grid gap-2 sm:grid-cols-3">{options.map((option) => <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-full px-4 py-3 text-left text-sm font-semibold transition duration-200 active:scale-95 ${value === option ? "bg-emerald-100 text-emerald-800 shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:-translate-y-0.5"}`}>{option}</button>)}</div>;
}

function Settings() {
  const { profile, refreshProfile, darkMode, toggleDarkMode } = useProfile();
  const fileInputRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState({ ...defaultSettings, primaryGoal: profile?.primary_goal || defaultSettings.primaryGoal, learnerType: profile?.learner_type || defaultSettings.learnerType, studentLevel: profile?.education_level || "", subject: profile?.settings_subject || profile?.subjects?.[0] || "", currentTopic: profile?.current_topic || "", curriculumStandard: profile?.curriculum_standard || "None/General", learningStyle: resolveLearningStyleFromProfile(profile?.learning_style), knowledgeGaps: profile?.knowledge_gaps || [], accessibilityNeeds: profile?.accessibility_needs || [], language: profile?.language || "English", reducedMotion: profile?.reduced_motion || false, collaborationInterest: profile?.collaboration_interest || defaultSettings.collaborationInterest, preferredTime: profile?.preferred_time || defaultSettings.preferredTime, studyDays: profile?.study_days || defaultSettings.studyDays, weeklyHours: profile?.weekly_hours || defaultSettings.weeklyHours });
  const [openSections, setOpenSections] = useState([true, true, true, true]);
  const [gapInput, setGapInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState("");
  const notificationSettings = getNotificationPreferences();
  const [activeTab, setActiveTab] = useState("Profile");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
      }
    }
    loadUser();
  }, []);

  const resolvedUser = currentUser || (profile?.user_id ? { id: profile.user_id, email: profile.email } : null);

  useEffect(() => {
    if (!profile) return;
    setSettings({
      ...defaultSettings,
      primaryGoal: profile.primary_goal || defaultSettings.primaryGoal,
      learnerType: profile.learner_type || defaultSettings.learnerType,
      studentLevel: profile.education_level || "",
      subject: profile.settings_subject || profile.subjects?.[0] || "",
      currentTopic: profile.current_topic || "",
      curriculumStandard: profile.curriculum_standard || "None/General",
      learningStyle: resolveLearningStyleFromProfile(profile.learning_style),
      knowledgeGaps: profile.knowledge_gaps || [],
      accessibilityNeeds: profile.accessibility_needs || [],
      language: profile.language || "English",
      reducedMotion: profile.reduced_motion || false,
      collaborationInterest: profile.collaboration_interest || defaultSettings.collaborationInterest,
      preferredTime: profile.preferred_time || defaultSettings.preferredTime,
      studyDays: profile.study_days || defaultSettings.studyDays,
      weeklyHours: profile.weekly_hours || defaultSettings.weeklyHours,
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
    const updatedSubjects = settings.subject
      ? Array.from(new Set([settings.subject, ...(Array.isArray(profile?.subjects) ? profile.subjects : [])].filter(Boolean)))
      : (Array.isArray(profile?.subjects) ? profile.subjects : []);

    const payload = { primary_goal: settings.primaryGoal, learner_type: settings.learnerType, education_level: settings.studentLevel, settings_subject: settings.subject, subjects: updatedSubjects, current_topic: settings.currentTopic.trim(), curriculum_standard: settings.curriculumStandard, learning_style: Array.isArray(profile?.learning_style) ? [settings.learningStyle] : settings.learningStyle, knowledge_gaps: settings.knowledgeGaps, accessibility_needs: settings.accessibilityNeeds, language: settings.language, reduced_motion: settings.reducedMotion, collaboration_interest: settings.collaborationInterest, preferred_time: settings.preferredTime, study_days: settings.studyDays, weekly_hours: Number(settings.weeklyHours) || 5, dark_mode: darkMode, ...(selectedFile ? { user_img: userImg } : {}) };
    const { error: saveError } = await supabase.from("profiles").update(payload).eq("user_id", user.id);
    if (saveError) { if (selectedFile) await supabase.storage.from(STORAGE_BUCKET).remove([userImg]); setError(saveError.message); setIsSaving(false); return; }

    const persistedPreferences = persistNotificationPreferences(notificationSettings);

    await refreshProfile();
    setSelectedFile(null);
    setMessage("Settings Saved Successfully.");
    recordNotification({
      title: "Preferences updated",
      body: "Your study and notification settings were saved.",
      type: "systemAlerts",
      context: "settings",
    }, persistedPreferences);
    setIsSaving(false);
  };

  const image = preview || profile?.avatar_url;
  const name = profile?.full_name || profile?.username || "Learner";
  const subjectOptions = getSubjectOptions(settings.studentLevel);
  const fieldClass = "rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

  const tabs = ["Profile", "Billing", "Notifications", "Privacy", "Appearance"];

  return <PageContainer maxWidth="max-w-5xl"><div className="settings-page text-slate-900"><header className="mb-7"><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Settings</h1><p className="mt-2 text-base text-slate-500">Manage your account and preferences</p></header><nav className="settings-tabs mb-6 flex w-full gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-slate-200/80 p-1 sm:rounded-full" aria-label="Settings sections">{tabs.map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`flex min-h-[44px] shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition duration-200 active:scale-95 ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:bg-white/50 hover:text-slate-800"}`}>{tab}</button>)}</nav><div className="settings-card">
    {activeTab === "Privacy" ? <div className="py-10 text-center"><h2 className="text-xl font-bold text-slate-900">Privacy</h2><p className="mt-2 text-sm text-slate-500">Privacy settings are not available yet.</p></div> : null}
    {activeTab === "Billing" && <Billing user={resolvedUser} />}
    {activeTab === "Profile" && <div className="space-y-10"><div><h2 className="text-2xl font-bold text-slate-900">Profile</h2><p className="mt-1 text-sm text-slate-500">Your personal details</p></div>
    <Section title="Change Profile Picture" description="Choose The Image You Want To Show In Your Sidebar." open={true} onToggle={() => {}}><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><button type="button" onClick={() => fileInputRef.current?.click()} className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-emerald-100 text-emerald-800">{image ? <img src={image} alt={`${name} profile`} className="h-full w-full object-cover" /> : <span className="text-3xl font-bold">{name.charAt(0).toUpperCase()}</span>}<span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition group-hover:opacity-100"><Camera size={22} /></span></button><div><p className="font-semibold">{name}</p><p className="mt-1 text-sm text-slate-500">Use A JPG, PNG, Or Other Image Up To 5 MB.</p><button type="button" onClick={() => fileInputRef.current?.click()} className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Choose Image</button><input ref={fileInputRef} type="file" accept="image/*" onChange={chooseFile} className="hidden" /></div></div></Section>
    <Section title="Profile & Curriculum" description="Tell Hyper Tutor What You Are Learning And Where You Are Starting." open={openSections[0]} onToggle={() => toggleSection(0)}><div className="grid gap-5 md:grid-cols-2"><SelectField label="Student Level" value={settings.studentLevel} onChange={(value) => update("studentLevel", value)} options={levels} /><SelectField label="Primary Goal" value={settings.primaryGoal} onChange={(value) => update("primaryGoal", value)} options={primaryGoalOptions} /><SelectField label="Subject" value={settings.subject} onChange={(value) => update("subject", value)} options={subjectOptions} /><label className="block text-sm font-semibold text-slate-700">Current Topic<input value={settings.currentTopic} onChange={(event) => update("currentTopic", event.target.value)} placeholder="E.g. Cell Division" className={`mt-2 w-full ${fieldClass}`} /></label><SelectField label="Curriculum Standard" value={settings.curriculumStandard} onChange={(value) => update("curriculumStandard", value)} options={["AP Biology", "Common Core Algebra II", "IB Math SL", "None/General"]} /><label className="block text-sm font-semibold text-slate-700">Target Weekly Study Hours<input type="number" min="1" max="80" value={settings.weeklyHours} onChange={(event) => update("weeklyHours", event.target.value)} placeholder="E.g. 5" className={`mt-2 w-full ${fieldClass}`} /></label></div><div className="mt-5"><p className="mb-3 text-sm font-semibold text-slate-700">Learner Type</p><ChoiceRow options={learnerTypeOptions} value={settings.learnerType} onChange={(value) => update("learnerType", value)} /></div><div className="mt-5"><p className="mb-3 text-sm font-semibold text-slate-700">Learning Style</p><ChoiceRow options={styles} value={settings.learningStyle} onChange={(value) => update("learningStyle", value)} /></div><div className="mt-5"><p className="mb-3 text-sm font-semibold text-slate-700">Preferred Focus Time</p><ChoiceRow options={preferredTimeOptions} value={settings.preferredTime} onChange={(value) => update("preferredTime", value)} /></div><div className="mt-5"><p className="mb-3 text-sm font-semibold text-slate-700">Target Study Days</p><div className="grid grid-cols-4 gap-2 sm:grid-cols-7">{dayOptions.map((day) => { const selected = settings.studyDays.includes(day); return <button key={day} type="button" onClick={() => update("studyDays", selected ? settings.studyDays.filter((item) => item !== day) : [...settings.studyDays, day])} className={`rounded-full px-3 py-2.5 text-center text-xs font-semibold transition ${selected ? "bg-emerald-100 text-emerald-800 shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>{day}</button>; })}</div></div><div className="mt-5"><p className="mb-3 text-sm font-semibold text-slate-700">Collaboration Preference</p><ChoiceRow options={collaborationOptions} value={settings.collaborationInterest} onChange={(value) => update("collaborationInterest", value)} /></div></Section>
    <Section title="Knowledge Gaps" description="Keep Track Of Concepts That Need More Practice." open={openSections[1]} onToggle={() => toggleSection(1)}><div className="flex gap-2"><input value={gapInput} onChange={(event) => setGapInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addGap())} placeholder="Add A Knowledge Gap" className={`min-w-0 flex-1 ${fieldClass}`} /><button type="button" onClick={addGap} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"><Plus size={17} /> Add</button></div><div className="mt-4 flex flex-wrap gap-2">{settings.knowledgeGaps.length ? settings.knowledgeGaps.map((gap) => <span key={gap} className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">{gap}<button type="button" onClick={() => update("knowledgeGaps", settings.knowledgeGaps.filter((item) => item !== gap))} title={`Remove ${gap}`}><Trash2 size={14} /></button></span>) : <p className="text-sm text-slate-500">No Knowledge Gaps Added Yet.</p>}</div><button type="button" onClick={() => { if (window.confirm("Reset Your Knowledge Gap Diagnosis?")) update("knowledgeGaps", []); }} className="mt-6 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Reset Diagnosis</button></Section>
    <SocraticStrictness />
    <Section title="Accessibility & Experience" description="Make Hyper Tutor More Comfortable And Useful For You." open={openSections[3]} onToggle={() => toggleSection(3)}><div><p className="mb-3 text-sm font-semibold text-slate-700">Accessibility Support</p><div className="grid gap-2 sm:grid-cols-2">{accessibilityOptions.map((option) => { const selected = hasAccessibilityNeed(settings.accessibilityNeeds, option); return <button type="button" key={option} onClick={() => update("accessibilityNeeds", selected ? settings.accessibilityNeeds.filter((item) => item.toLowerCase() !== option.toLowerCase()) : [...settings.accessibilityNeeds.filter((item) => item.toLowerCase() !== "none"), option])} className={`rounded-full px-4 py-3 text-left text-sm font-semibold ${selected ? "bg-emerald-100 text-emerald-800" : "bg-slate-50 text-slate-600"}`}>{option}</button>; })}</div></div><div className="mt-5 grid gap-5 md:grid-cols-3"><SelectField label="Language" value={settings.language} onChange={(value) => update("language", value)} options={["English", "Spanish", "French", "German"]} /><label className="flex items-center gap-3 rounded-full bg-slate-50 p-4 text-sm font-semibold text-slate-700"><input type="checkbox" checked={settings.reducedMotion} onChange={(event) => update("reducedMotion", event.target.checked)} className="h-4 w-4 accent-emerald-600" /> Reduce Motion</label><label className="flex items-center gap-3 rounded-full bg-slate-50 p-4 text-sm font-semibold text-slate-700"><input type="checkbox" checked={darkMode} onChange={(event) => toggleDarkMode(event.target.checked)} className="h-4 w-4 accent-emerald-600" /> Dark Mode</label></div></Section>
    </div>}
    {activeTab === "Appearance" && <div className="space-y-10"><Section title="Appearance" description="Make Hyper Tutor more comfortable and useful for you." open={true} onToggle={() => {}}><div className="grid gap-5 md:grid-cols-2"><label className="flex items-center justify-between rounded-full bg-slate-50 p-4 text-sm font-semibold text-slate-700">Reduce Motion<input type="checkbox" checked={settings.reducedMotion} onChange={(event) => update("reducedMotion", event.target.checked)} className="h-4 w-4 accent-emerald-600" /></label><label className="flex items-center justify-between rounded-full bg-slate-50 p-4 text-sm font-semibold text-slate-700">Dark Mode<input type="checkbox" checked={darkMode} onChange={(event) => toggleDarkMode(event.target.checked)} className="h-4 w-4 accent-emerald-600" /></label></div></Section></div>}
    {activeTab === "Notifications" && <NotificationSettings userId={resolvedUser?.id} />}
  </div>{error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{message && <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}{activeTab === "Profile" && <button type="button" onClick={save} disabled={isSaving} className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} {isSaving ? "Saving..." : "Save All Settings"}</button>}</div></PageContainer>;
}

export default Settings;
