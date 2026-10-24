import { useState, useEffect, useRef } from "react";
import {
  Bell,
  CalendarDays,
  Clock3,
  Repeat,
  Save,
  Plus,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Sparkles,
} from "lucide-react";
import { getPermissionState } from "../../lib/push";
import {
  formatTimeSlot,
  calculateEndTimeString,
  getPlannerDefaults,
  generateRecurrencePreview,
  suggestNextFreeSlot,
} from "../../lib/plannerUtils";
import { usePlannerConflicts } from "../../hooks/usePlanner";
import Modal from "../common/ResponsiveSheet";

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-900/30";

const PRESET_DURATIONS = [15, 25, 30, 45, 60, 90, 120];

const COLOR_PALETTE = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
];

function PlannerActivityModal({
  mode: modeProp,
  selectedDate = null,
  initialData = null,
  subjects = [],
  onAddSubject = null,
  isSaving = false,
  onClose,
  onSubmit,
  onDelete = null,
  _onDuplicate = null,
  preferredTime = null,
}) {
  const defaults = getPlannerDefaults(preferredTime);
  const titleInputRef = useRef(null);

  const [activeMode, setActiveMode] = useState(modeProp || "session");

  useEffect(() => {
    if (modeProp) setActiveMode(modeProp);
  }, [modeProp]);

  const mode = activeMode;

  const [form, setForm] = useState(() => {
    const targetDateObj = selectedDate || new Date();
    const dateStr = targetDateObj instanceof Date && !isNaN(targetDateObj.getTime())
      ? `${targetDateObj.getFullYear()}-${String(targetDateObj.getMonth() + 1).padStart(2, '0')}-${String(targetDateObj.getDate()).padStart(2, '0')}`
      : defaults.date;

    let timeStr = defaults.startTime;
    if (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
      if (selectedDate.getHours() !== 0 || selectedDate.getMinutes() !== 0) {
        timeStr = `${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}`;
      }
    }

    const dayOfWeek = targetDateObj instanceof Date && !isNaN(targetDateObj.getTime()) ? targetDateObj.getDay() : new Date().getDay();

    if (initialData) {
      const initDate = initialData.date
        ? (initialData.date instanceof Date ? `${initialData.date.getFullYear()}-${String(initialData.date.getMonth() + 1).padStart(2, '0')}-${String(initialData.date.getDate()).padStart(2, '0')}` : String(initialData.date).slice(0, 10))
        : (initialData.block_date || dateStr);

      return {
        id: initialData.id,
        ruleId: initialData.ruleId,
        type: initialData.type || (mode === "timeblock" ? "time_block" : mode === "recurring" ? "recurring_session" : mode === "deadline" ? "deadline" : "study"),
        title: initialData.title || initialData.purpose || "",
        subject: initialData.subject || defaults.subject || "",
        subject_id: initialData.subjectId || null,
        date: initDate,
        startTime: initialData.startTime || initialData.start_time || timeStr,
        duration: initialData.duration || defaults.duration,
        priority: initialData.priority || defaults.priority,
        color: initialData.color || defaults.color,
        reminder: initialData.reminder ?? defaults.reminder,
        notes: initialData.notes || "",
        break_reminder: Boolean(initialData.break_reminder),
        recurring_frequency: initialData.recurring_frequency || initialData.frequency || (mode === "recurring" ? "daily" : "none"),
        recurring_interval: initialData.recurring_interval || 1,
        recurring_days_of_week: initialData.recurring_days_of_week || initialData.days_of_week || [dayOfWeek],
        recurring_ends_mode: initialData.recurring_ends_mode || "never",
        recurring_ends_on: initialData.recurring_ends_on || initialData.end_date || null,
        recurring_max_occurrences: initialData.recurring_max_occurrences || null,
      };
    }

    return {
      type: mode === "timeblock" ? "time_block" : mode === "recurring" ? "recurring_session" : mode === "deadline" ? "deadline" : "study",
      title: "",
      subject: defaults.subject || "",
      subject_id: null,
      date: dateStr,
      startTime: timeStr,
      duration: defaults.duration || 45,
      priority: defaults.priority || "normal",
      color: defaults.color || "#3B82F6",
      reminder: defaults.reminder ?? 15,
      notes: "",
      break_reminder: false,
      recurring_frequency: mode === "recurring" ? "daily" : "none",
      recurring_interval: 1,
      recurring_days_of_week: [dayOfWeek],
      recurring_ends_mode: "never",
      recurring_ends_on: null,
      recurring_max_occurrences: null,
    };
  });

  const [validationError, setValidationError] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [showNewSubjectInput, setShowNewSubjectInput] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Autofocus title input on mount
  useEffect(() => {
    if (mode && titleInputRef.current) {
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [mode]);

  // Conflict detection
  const currentStartAt = form.date && form.startTime ? `${form.date}T${form.startTime}:00` : null;
  const { conflicts } = usePlannerConflicts(currentStartAt, form.duration, form.id);

  if (!mode) return null;

  const permission = getPermissionState();
  const isTimeBlock = mode === "timeblock" || form.type === "time_block";
  const isDeadline = mode === "deadline" || form.type === "deadline";
  const isRecurring = mode === "recurring" || form.type === "recurring_session" || form.recurring_frequency !== "none";
  const isEditing = Boolean(form.id);

  const titles = {
    session: [isEditing ? "Edit study session" : "Add study session", "Plan a focused learning block."],
    recurring: [isEditing ? "Edit recurring session" : "Add recurring session", "Create a rhythm you can return to."],
    deadline: [isEditing ? "Edit deadline" : "Add upcoming deadline", "Keep an important due date visible."],
    timeblock: [isEditing ? "Edit time block" : "Add time block", "Reserve time for focused work."],
  };
  const [titleText, subtitleText] = titles[mode] || titles.session;

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (validationError) setValidationError("");
  };

  const handleToggleDay = (dayIndex) => {
    const current = form.recurring_days_of_week || [];
    const next = current.includes(dayIndex)
      ? current.filter((d) => d !== dayIndex)
      : [...current, dayIndex];
    update("recurring_days_of_week", next);
  };

  const handleCreateSubjectInline = () => {
    if (!newSubjectName.trim()) return;
    const name = newSubjectName.trim();
    if (onAddSubject) onAddSubject(name);
    update("subject", name);
    setNewSubjectName("");
    setShowNewSubjectInput(false);
  };

  const handleSuggestNextFreeSlot = () => {
    if (!currentStartAt) return;
    const { suggestedStartStr } = suggestNextFreeSlot(new Date(currentStartAt), form.duration, conflicts);
    update("startTime", suggestedStartStr);
  };

  const validateAndSubmit = (e) => {
    e.preventDefault();
    setValidationError("");

    // Custom Validation logic per type
    if (!form.title.trim()) {
      setValidationError("Please enter a title.");
      return;
    }

    if (!form.date) {
      setValidationError("Please select a date.");
      return;
    }

    if (form.date && form.startTime && !isDeadline) {
      const selectedDateTime = new Date(`${form.date}T${form.startTime}:00`);
      if (selectedDateTime < new Date()) {
        setValidationError("Cannot schedule an activity in the past.");
        return;
      }
    }

    if (!isDeadline) {
      const durationNum = Number(form.duration);
      if (!Number.isFinite(durationNum) || durationNum < 5 || durationNum > 720) {
        setValidationError("Duration must be between 5 and 720 minutes.");
        return;
      }
    }

    if (isTimeBlock) {
      if (!form.startTime) {
        setValidationError("Please select a start time.");
        return;
      }
      const endTime = calculateEndTimeString(form.startTime, form.duration);
      if (endTime <= form.startTime && !endTime.includes("PM")) {
        setValidationError("End time must be after start time.");
        return;
      }
    }

    if (isRecurring) {
      let freq = form.recurring_frequency;
      if (freq === "custom") freq = "weekly";
      if (freq === "weekly" && (!Array.isArray(form.recurring_days_of_week) || form.recurring_days_of_week.length === 0)) {
        setValidationError("Please select at least one day of the week for weekly recurring sessions.");
        return;
      }
    }

    onSubmit(form);
  };

  const recurrencePreview = generateRecurrencePreview({
    startDate: form.date,
    frequency: form.recurring_frequency,
    interval: form.recurring_interval,
    daysOfWeek: form.recurring_days_of_week,
    endsMode: form.recurring_ends_mode,
    endsOn: form.recurring_ends_on,
    maxOccurrences: form.recurring_max_occurrences,
  });

  return (
    <>
      <Modal
        isOpen={Boolean(mode)}
        onClose={onClose}
        title={titleText}
        maxWidth="max-w-xl"
        closeOnOverlayClick={false}
      >
        <div>
          <p className="-mt-2 mb-4 text-xs text-slate-500 dark:text-slate-400">{subtitleText}</p>

          {/* Validation Errors */}
          {validationError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {validationError}
            </div>
          )}

          {/* Conflict Warning Card */}
          {conflicts.length > 0 && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="flex-1 text-xs">
                  <p className="font-bold">Overlaps with existing activity:</p>
                  <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                    "{conflicts[0].title}" ({new Date(conflicts[0].start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(conflicts[0].end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </p>
                  <button
                    type="button"
                    onClick={handleSuggestNextFreeSlot}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-amber-700 transition"
                  >
                    <Sparkles className="h-3 w-3" />
                    Suggest next free slot
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Activity Type Selector (for new activities) */}
          {!isEditing && (
            <div className="mb-4 grid grid-cols-4 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
              {[
                { id: "session", label: "Session", type: "study" },
                { id: "recurring", label: "Recurring", type: "recurring_session" },
                { id: "timeblock", label: "Time Block", type: "time_block" },
                { id: "deadline", label: "Deadline", type: "deadline" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setActiveMode(m.id);
                    update("type", m.type);
                    if (m.id === "recurring" && form.recurring_frequency === "none") {
                      update("recurring_frequency", "daily");
                    }
                  }}
                  className={`rounded-lg py-2 text-xs font-bold transition ${
                    mode === m.id
                      ? "bg-white text-blue-600 shadow-xs dark:bg-slate-800 dark:text-blue-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={validateAndSubmit} className="space-y-4 text-sm">
            {/* Title input */}
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Title <span className="text-red-500">*</span>
              <div className="relative mt-1.5">
                <input
                  ref={titleInputRef}
                  value={form.title}
                  onChange={(e) => update("title", e.target.value.slice(0, 100))}
                  required
                  maxLength={100}
                  placeholder={isTimeBlock ? "e.g. Deep work block" : "e.g. Revise Chapter 4 Taxation"}
                  className={fieldClass}
                />
                <span className="absolute right-3 top-3 text-[10px] text-slate-400">
                  {form.title.length}/100
                </span>
              </div>
            </label>

            {/* Subject selector (if not timeblock) */}
            {!isTimeBlock && (
              <div className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between mb-1.5">
                  <span>Subject</span>
                  <button
                    type="button"
                    onClick={() => setShowNewSubjectInput(!showNewSubjectInput)}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <Plus size={12} /> Add subject
                  </button>
                </div>

                {showNewSubjectInput ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder="New subject name"
                      className={fieldClass}
                    />
                    <button
                      type="button"
                      onClick={handleCreateSubjectInline}
                      className="shrink-0 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <select
                    value={form.subject}
                    onChange={(e) => update("subject", e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Select subject (optional)</option>
                    {subjects.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Date and Start time */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5 mb-1.5">
                  <CalendarDays size={14} /> Date
                </span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => update("date", e.target.value)}
                  required
                  className={fieldClass}
                />
              </label>

              {!isDeadline && (
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 mb-1.5">
                    <Clock3 size={14} /> Start time
                  </span>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => update("startTime", e.target.value)}
                    required
                    className={fieldClass}
                  />
                </label>
              )}
            </div>

            {/* Duration Preset Chips and Stepper */}
            {!isDeadline && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Duration (minutes)
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {formatTimeSlot(form.startTime)} ({form.duration} min)
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PRESET_DURATIONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => update("duration", preset)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                        Number(form.duration) === preset
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  min="5"
                  max="720"
                  value={form.duration}
                  onChange={(e) => update("duration", Math.max(5, Math.min(720, Number(e.target.value))))}
                  required
                  className={fieldClass}
                />
              </div>
            )}

            {/* Priority Segmented Control */}
            {!isDeadline && (
              <div className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="mb-1.5 block">Priority</span>
                <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
                  {[
                    { id: "low", label: "Low", dot: "bg-emerald-500" },
                    { id: "normal", label: "Normal", dot: "bg-blue-500" },
                    { id: "important", label: "Important", dot: "bg-amber-500" },
                    { id: "urgent", label: "Urgent", dot: "bg-red-500" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => update("priority", p.id)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                        form.priority === p.id
                          ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Priority for Deadline */}
            {isDeadline && (
              <div className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="mb-1.5 block">Priority</span>
                <select
                  value={form.priority}
                  onChange={(e) => update("priority", e.target.value)}
                  className={fieldClass}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            )}

            {/* Repeat Rhythm Controls (Recurring) */}
            {mode === "recurring" && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 mb-1.5">
                    <Repeat size={14} /> Repeat rhythm
                  </span>
                  <select
                    value={form.recurring_frequency}
                    onChange={(e) => update("recurring_frequency", e.target.value)}
                    className={fieldClass}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekdays">Mon - Fri (Weekdays)</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </label>

                {(form.recurring_frequency === "weekly" || form.recurring_frequency === "custom") && (
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Repeat on</span>
                    <div className="flex gap-1">
                      {["S", "M", "T", "W", "T", "F", "S"].map((dayLetter, index) => {
                        const isSelected = (form.recurring_days_of_week || []).includes(index);
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleToggleDay(index)}
                            className={`flex h-8 flex-1 items-center justify-center rounded-lg text-xs font-extrabold transition ${
                              isSelected
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400"
                            }`}
                          >
                            {dayLetter}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <p className="font-semibold text-blue-600 dark:text-blue-400">{recurrencePreview.summary}</p>
                  {recurrencePreview.previewDates.length > 0 && (
                    <p>Next dates: {recurrencePreview.previewDates.join(", ")}</p>
                  )}
                </div>
              </div>
            )}

            {/* Reminder settings */}
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5 mb-1.5">
                <Bell size={14} /> Reminder
              </span>
              <select
                value={form.reminder === null ? -1 : form.reminder}
                onChange={(e) => update("reminder", Number(e.target.value) === -1 ? null : Number(e.target.value))}
                className={fieldClass}
              >
                <option value={-1}>None</option>
                <option value={0}>At start time</option>
                <option value={5}>5 minutes before</option>
                <option value={10}>10 minutes before</option>
                <option value={15}>15 minutes before</option>
                <option value={30}>30 minutes before</option>
                <option value={60}>1 hour before</option>
                <option value={1440}>1 day before</option>
              </select>
            </label>

            {permission !== "granted" && form.reminder !== null && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Browser push notifications are disabled. You will receive in-app alerts when signed in.
              </p>
            )}

            {/* Collapsible Details (Notes + Color + Break toggle) */}
            <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="flex w-full items-center justify-between py-1 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400"
              >
                <span>Add details (Notes, Color palette)</span>
                {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showDetails && (
                <div className="mt-3 space-y-3.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Notes
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={(e) => update("notes", e.target.value)}
                      placeholder="Add study objectives, links, or preparation notes..."
                      className={`mt-1.5 ${fieldClass}`}
                    />
                  </label>

                  <div className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className="mb-1.5 block">Activity Color</span>
                    <div className="flex gap-2">
                      {COLOR_PALETTE.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => update("color", hex)}
                          style={{ backgroundColor: hex }}
                          className={`h-7 w-7 rounded-full transition transform hover:scale-110 ${
                            form.color === hex ? "ring-2 ring-blue-500 ring-offset-2 scale-110" : ""
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.break_reminder}
                      onChange={(e) => update("break_reminder", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Break reminder after session
                  </label>
                </div>
              )}
            </div>

            {/* Sticky action bar */}
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              {isEditing && onDelete ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={16} />
                  {isSaving ? "Saving..." : "Save activity"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Confirmation Sub-modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete activity?"
        maxWidth="max-w-md"
        closeOnOverlayClick={true}
      >
        <div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Are you sure you want to delete "{form.title}"?
          </p>

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onDelete(form.id, form.type)}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              Confirm delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default PlannerActivityModal;
