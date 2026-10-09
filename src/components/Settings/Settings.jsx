import { useEffect, useRef, useState } from "react";
import { Bell, Camera, ChevronDown, Loader2, Plus, Save, Send, ShieldAlert, Smartphone, Trash2 } from "lucide-react";
import { useProfile } from "../../app/ProfileContext";
import supabase from "../../lib/supabase.js";
import Billing from "./Billing";
import SocraticStrictness from "./SocraticStrictness";
import { useNotifications } from "../../hooks/useNotifications";
import {
  getNotificationPreferences,
  persistNotificationPreferences,
  recordNotification,
} from "../../lib/notifications";

const STORAGE_BUCKET = "user-images";
const levels = ["9th Grade", "10th Grade", "11th Grade", "12th Grade", "College Freshman", "College Student", "Professional"];
const primaryGoalOptions = ["Improve my grades", "Prepare for an exam", "Learn a new skill", "Advance my career"];
const learnerTypeOptions = ["Academic achiever", "Struggling learner", "Lifelong learner"];
const generalSubjects = ["Mathematics", "Science", "English", "History", "Computer Science", "Languages", "Business", "Arts"];
const schoolSubjects = ["AP Biology", "AP Chemistry", "AP Physics", "AP Calculus", "Common Core Algebra II", "Geometry", "Statistics"];
const styles = ["Visual", "Step-by-step", "Analogy-based"];
const accessibilityOptions = ["Screen Reader", "Text-to-speech", "High Contrast", "Larger Text", "None"];
const collaborationOptions = ["Keep me focused", "Find study groups", "Peer support", "Just me for now"];
const defaultSettings = { primaryGoal: "Improve my grades", learnerType: "Academic achiever", studentLevel: "", subject: "", currentTopic: "", curriculumStandard: "None/General", learningStyle: "Step-by-step", knowledgeGaps: [], socraticStrictness: "Always Guide First", accessibilityNeeds: [], language: "English", reducedMotion: false, collaborationInterest: "Just me for now", studyDays: [] };

function Section({ title, description, children, open, onToggle }) {
  return <section className="settings-section"><button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 text-left"><span><h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p></span><ChevronDown className={`shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} size={20} /></button>{open && <div className="mt-7">{children}</div>}</section>;
}

function SelectField({ label, value, onChange, options }) {
  return <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="settings-field mt-2 w-full"><option value="">Choose {label.toLowerCase()}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function ChoiceRow({ options, value, onChange }) {
  return <div className="grid gap-2 sm:grid-cols-3">{options.map((option) => <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-full px-4 py-3 text-left text-sm font-semibold transition duration-200 active:scale-95 ${value === option ? "bg-emerald-100 text-emerald-800 shadow-sm dark:bg-emerald-950/80 dark:text-emerald-300 dark:border dark:border-emerald-800" : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:-translate-y-0.5 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}>{option}</button>)}</div>;
}

function Settings() {
  const { profile, refreshProfile, darkMode, toggleDarkMode } = useProfile();
  const fileInputRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState({ ...defaultSettings, primaryGoal: profile?.primary_goal || defaultSettings.primaryGoal, learnerType: profile?.learner_type || defaultSettings.learnerType, studentLevel: profile?.education_level || "", subject: profile?.settings_subject || profile?.subjects?.[0] || "", currentTopic: profile?.current_topic || "", curriculumStandard: profile?.curriculum_standard || "None/General", learningStyle: profile?.learning_style || defaultSettings.learningStyle, knowledgeGaps: profile?.knowledge_gaps || [], socraticStrictness: profile?.socratic_strictness || defaultSettings.socraticStrictness, accessibilityNeeds: profile?.accessibility_needs || [], language: profile?.language || "English", reducedMotion: profile?.reduced_motion || false, collaborationInterest: profile?.collaboration_interest || defaultSettings.collaborationInterest, studyDays: profile?.study_days || [] });
  const [openSections, setOpenSections] = useState([true, true, true, true]);
  const [gapInput, setGapInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [notificationSettings, setNotificationSettings] = useState(() => getNotificationPreferences());
  const [activeTab, setActiveTab] = useState("Profile");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState("");

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
  const pushHooks = useNotifications(resolvedUser?.id);

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
      learningStyle: profile.learning_style || defaultSettings.learningStyle,
      knowledgeGaps: profile.knowledge_gaps || [],
      socraticStrictness: profile.socratic_strictness || defaultSettings.socraticStrictness,
      accessibilityNeeds: profile.accessibility_needs || [],
      language: profile.language || "English",
      reducedMotion: profile.reduced_motion || false,
      collaborationInterest: profile.collaboration_interest || defaultSettings.collaborationInterest,
      studyDays: profile.study_days || [],
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
    const payload = { primary_goal: settings.primaryGoal, learner_type: settings.learnerType, education_level: settings.studentLevel, settings_subject: settings.subject, current_topic: settings.currentTopic.trim(), curriculum_standard: settings.curriculumStandard, learning_style: settings.learningStyle, knowledge_gaps: settings.knowledgeGaps, socratic_strictness: settings.socraticStrictness, accessibility_needs: settings.accessibilityNeeds, language: settings.language, reduced_motion: settings.reducedMotion, collaboration_interest: settings.collaborationInterest, study_days: settings.studyDays, dark_mode: darkMode, ...(selectedFile ? { user_img: userImg } : {}) };
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

  const handleSendTestNotification = async () => {
    setTestSending(true);
    setTestResult("");
    try {
      const res = await pushHooks.sendTest();
      setTestResult(res?.message || "Test notification triggered.");
    } catch (err) {
      setTestResult(err.message || "Failed to send test notification.");
    } finally {
      setTestSending(false);
    }
  };

  const image = preview || profile?.avatar_url;
  const name = profile?.full_name || profile?.username || "Learner";
  const subjectOptions = settings.studentLevel.includes("Grade") ? [...generalSubjects, ...schoolSubjects] : generalSubjects;
  const fieldClass = "rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

  const toggleNotificationCategory = (key) => {
    const next = { ...notificationSettings, [key]: !notificationSettings[key] };
    setNotificationSettings(next);
    persistNotificationPreferences(next);
  };

  const tabs = ["Profile", "Billing", "Notifications", "Privacy", "Appearance"];

  return <main className="settings-page min-h-screen px-4 pb-24 pt-6 text-slate-900 dark:text-slate-100 sm:px-6 md:px-10 md:pb-14 md:pt-10"><div className="mx-auto max-w-5xl"><header className="mb-7"><h1 className="text-3xl font-black tracking-tight sm:text-4xl dark:text-white">Settings</h1><p className="mt-2 text-base text-slate-500 dark:text-slate-400">Manage your account and preferences</p></header><nav className="settings-tabs mb-6 flex w-full gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-slate-200/80 p-1 sm:rounded-full dark:bg-slate-800/80" aria-label="Settings sections">{tabs.map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`flex min-h-[44px] shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition duration-200 active:scale-95 ${activeTab === tab ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white" : "text-slate-500 hover:bg-white/50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200"}`}>{tab}</button>)}</nav><div className="settings-card">
    {activeTab === "Privacy" ? <div className="py-10 text-center"><h2 className="text-xl font-bold text-slate-900 dark:text-white">Privacy</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Privacy settings are not available yet.</p></div> : null}
    {activeTab === "Billing" && <Billing user={resolvedUser} />}
    {activeTab === "Profile" && <div className="space-y-10"><div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">Profile</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your personal details</p></div>
    <Section title="Change Profile Picture" description="Choose The Image You Want To Show In Your Sidebar." open={true} onToggle={() => {}}><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><button type="button" onClick={() => fileInputRef.current?.click()} className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{image ? <img src={image} alt={`${name} profile`} className="h-full w-full object-cover" /> : <span className="text-3xl font-bold">{name.charAt(0).toUpperCase()}</span>}<span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition group-hover:opacity-100"><Camera size={22} /></span></button><div><p className="font-semibold dark:text-white">{name}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use A JPG, PNG, Or Other Image Up To 5 MB.</p><button type="button" onClick={() => fileInputRef.current?.click()} className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Choose Image</button><input ref={fileInputRef} type="file" accept="image/*" onChange={chooseFile} className="hidden" /></div></div></Section>
    <Section title="Profile & Curriculum" description="Tell Hyper Tutor What You Are Learning And Where You Are Starting." open={openSections[0]} onToggle={() => toggleSection(0)}><div className="grid gap-5 md:grid-cols-2"><SelectField label="Student Level" value={settings.studentLevel} onChange={(value) => update("studentLevel", value)} options={levels} /><SelectField label="Primary Goal" value={settings.primaryGoal} onChange={(value) => update("primaryGoal", value)} options={primaryGoalOptions} /><SelectField label="Subject" value={settings.subject} onChange={(value) => update("subject", value)} options={subjectOptions} /><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Current Topic<input value={settings.currentTopic} onChange={(event) => update("currentTopic", event.target.value)} placeholder="E.g. Cell Division" className={`mt-2 w-full ${fieldClass}`} /></label><SelectField label="Curriculum Standard" value={settings.curriculumStandard} onChange={(value) => update("curriculumStandard", value)} options={["AP Biology", "Common Core Algebra II", "IB Math SL", "None/General"]} /></div><div className="mt-5"><p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Learner Type</p><ChoiceRow options={learnerTypeOptions} value={settings.learnerType} onChange={(value) => update("learnerType", value)} /></div><div className="mt-5"><p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Learning Style</p><ChoiceRow options={styles} value={settings.learningStyle} onChange={(value) => update("learningStyle", value)} /></div><div className="mt-5"><p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Target Study Days</p><div className="flex flex-wrap gap-2">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => { const selected = (settings.studyDays || []).includes(day); return <button key={day} type="button" onClick={() => { const current = settings.studyDays || []; const next = selected ? current.filter((d) => d !== day) : [...current, day]; update("studyDays", next); }} className={`rounded-full px-3.5 py-2 text-xs font-semibold transition duration-200 active:scale-95 ${selected ? "bg-emerald-100 text-emerald-800 shadow-sm dark:bg-emerald-950/80 dark:text-emerald-300 dark:border dark:border-emerald-800" : "bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}>{day}</button>; })}</div></div><div className="mt-5"><p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Collaboration Preference</p><ChoiceRow options={collaborationOptions} value={settings.collaborationInterest} onChange={(value) => update("collaborationInterest", value)} /></div></Section>
    <Section title="Knowledge Gaps" description="Keep Track Of Concepts That Need More Practice." open={openSections[1]} onToggle={() => toggleSection(1)}><div className="flex gap-2"><input value={gapInput} onChange={(event) => setGapInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addGap())} placeholder="Add A Knowledge Gap" className={`min-w-0 flex-1 ${fieldClass}`} /><button type="button" onClick={addGap} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"><Plus size={17} /> Add</button></div><div className="mt-4 flex flex-wrap gap-2">{settings.knowledgeGaps.length ? settings.knowledgeGaps.map((gap) => <span key={gap} className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 dark:border dark:border-amber-800/60">{gap}<button type="button" onClick={() => update("knowledgeGaps", settings.knowledgeGaps.filter((item) => item !== gap))} title={`Remove ${gap}`}><Trash2 size={14} /></button></span>) : <p className="text-sm text-slate-500 dark:text-slate-400">No Knowledge Gaps Added Yet.</p>}</div><button type="button" onClick={() => { if (window.confirm("Reset Your Knowledge Gap Diagnosis?")) update("knowledgeGaps", []); }} className="mt-6 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30">Reset Diagnosis</button></Section>
    <SocraticStrictness />
    <Section title="Accessibility & Experience" description="Make Hyper Tutor More Comfortable And Useful For You." open={openSections[3]} onToggle={() => toggleSection(3)}><div><p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Accessibility Support</p><div className="grid gap-2 sm:grid-cols-2">{accessibilityOptions.map((option) => { const selected = settings.accessibilityNeeds.includes(option); return <button type="button" key={option} onClick={() => update("accessibilityNeeds", selected ? settings.accessibilityNeeds.filter((item) => item !== option) : [...settings.accessibilityNeeds.filter((item) => item !== "None"), option])} className={`rounded-full px-4 py-3 text-left text-sm font-semibold ${selected ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border dark:border-emerald-800" : "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}>{option}</button>; })}</div></div><div className="mt-5 grid gap-5 md:grid-cols-3"><SelectField label="Language" value={settings.language} onChange={(value) => update("language", value)} options={["English", "Spanish", "French", "German"]} /><label className="flex items-center gap-3 rounded-full bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"><input type="checkbox" checked={settings.reducedMotion} onChange={(event) => update("reducedMotion", event.target.checked)} className="h-4 w-4 accent-emerald-600" /> Reduce Motion</label><label className="flex items-center gap-3 rounded-full bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"><input type="checkbox" checked={darkMode} onChange={(event) => toggleDarkMode(event.target.checked)} className="h-4 w-4 accent-emerald-600" /> Dark Mode</label></div></Section>
    </div>}
    {activeTab === "Appearance" && <div className="space-y-10"><Section title="Appearance" description="Make Hyper Tutor more comfortable and useful for you." open={true} onToggle={() => {}}><div className="grid gap-5 md:grid-cols-2"><label className="flex items-center justify-between rounded-full bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">Reduce Motion<input type="checkbox" checked={settings.reducedMotion} onChange={(event) => update("reducedMotion", event.target.checked)} className="h-4 w-4 accent-emerald-600" /></label><label className="flex items-center justify-between rounded-full bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">Dark Mode<input type="checkbox" checked={darkMode} onChange={(event) => toggleDarkMode(event.target.checked)} className="h-4 w-4 accent-emerald-600" /></label></div></Section></div>}
    {activeTab === "Notifications" && <Section title="Notifications" description="Control when and how Hyper Tutor reaches you." open={true} onToggle={() => {}}>
      <div className="space-y-6">
        {/* Master Web Push Switch & Browser Status */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">Web Push Notifications</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Receive background alerts for study sessions and streak warnings even when the browser tab is closed.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {pushHooks.permissionState === "granted" ? (
                <button
                  type="button"
                  onClick={pushHooks.preferences.push_enabled ? pushHooks.disable : pushHooks.enable}
                  disabled={pushHooks.loading}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                    pushHooks.preferences.push_enabled
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-slate-600 hover:bg-slate-700"
                  } disabled:opacity-50`}
                >
                  <Bell className="h-4 w-4" />
                  {pushHooks.preferences.push_enabled ? "Enabled" : "Disabled"}
                </button>
              ) : pushHooks.permissionState === "denied" ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>Blocked in browser settings. Re-enable in site settings.</span>
                </div>
              ) : pushHooks.permissionState === "ios-install-needed" ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <Smartphone className="h-4 w-4 shrink-0" />
                  <span>Add to Home Screen on iOS to enable Web Push.</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={pushHooks.enable}
                  disabled={pushHooks.loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Bell className="h-4 w-4" />
                  {pushHooks.loading ? "Enabling..." : "Enable Push Alerts"}
                </button>
              )}
            </div>
          </div>

          {/* Test Notification Action */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Test Push Delivery</p>
              <p className="text-xs text-slate-500">Send an immediate test notification to your active push subscription.</p>
            </div>
            <button
              type="button"
              onClick={handleSendTestNotification}
              disabled={testSending || !pushHooks.enabled}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Send className="h-3.5 w-3.5" />
              {testSending ? "Sending test..." : "Send test notification"}
            </button>
          </div>
          {testResult && <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">{testResult}</p>}
        </div>

        {/* Master Toggles for Push Kinds */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Push Notification Types</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <span>Session reminders</span>
              <input
                type="checkbox"
                checked={Boolean(pushHooks.preferences.session_reminders)}
                onChange={(e) => pushHooks.updatePreference("session_reminders", e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <span>Streak alerts</span>
              <input
                type="checkbox"
                checked={Boolean(pushHooks.preferences.streak_alerts)}
                onChange={(e) => pushHooks.updatePreference("streak_alerts", e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <span>Inactivity nudges</span>
              <input
                type="checkbox"
                checked={Boolean(pushHooks.preferences.inactivity_nudges)}
                onChange={(e) => pushHooks.updatePreference("inactivity_nudges", e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
            </label>
          </div>
        </div>

        {/* In-app & Local preferences */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">In-app Categories</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["inApp", "In-app notifications"],
              ["studyReminders", "Study reminders"],
              ["deadlineReminders", "Deadline reminders"],
              ["progressMilestones", "Progress milestones"],
              ["aiSuggestions", "AI suggestions"],
              ["community", "Community updates"],
              ["systemAlerts", "System alerts"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                <span>{label}</span>
                <input type="checkbox" checked={Boolean(notificationSettings[key])} onChange={() => toggleNotificationCategory(key)} className="h-4 w-4 accent-emerald-600" />
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Digest cadence
            <select value={notificationSettings.digest} onChange={(event) => setNotificationSettings((current) => ({ ...current, digest: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Quiet hours
            <input type="checkbox" checked={Boolean(notificationSettings.quietHours?.enabled)} onChange={(event) => setNotificationSettings((current) => ({ ...current, quietHours: { ...current.quietHours, enabled: event.target.checked } }))} className="mt-2 h-4 w-4 accent-emerald-600" />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Start time
            <input type="time" value={notificationSettings.quietHours?.start || "22:00"} onChange={(event) => setNotificationSettings((current) => ({ ...current, quietHours: { ...current.quietHours, start: event.target.value } }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900" />
          </label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            End time
            <input type="time" value={notificationSettings.quietHours?.end || "08:00"} onChange={(event) => setNotificationSettings((current) => ({ ...current, quietHours: { ...current.quietHours, end: event.target.value } }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900" />
          </label>
        </div>
      </div>
    </Section>}
  </div>{error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{message && <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}{activeTab === "Profile" && <button type="button" onClick={save} disabled={isSaving} className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} {isSaving ? "Saving..." : "Save All Settings"}</button>}</div></main>;
}

export default Settings;
