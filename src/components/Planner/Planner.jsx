import React, { useState, useMemo } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Filter,
  Loader2,
  Timer,
  CheckCircle,
} from "lucide-react";
import Calendar from "./Calendar";
import PlannerActivityModal from "./PlannerActivityModal";
import DeadlineManager from "./DeadlineManager";
import PlannerStatsBar from "./PlannerStatsBar";
import RecurringSetup from "./RecurringSetup";
import TimeBlocking from "./TimeBlocking";
import ExternalCalendarSync from "./ExternalCalendarSync";
import { useProfile } from "../../app/ProfileContext";
import LoadingCompanion from "../common/LoadingCompanion";
import PageContainer from "../common/PageContainer";
import Modal from "../common/ResponsiveSheet";
import NotificationPromptCard from "../Notifications/NotificationPromptCard";
import {
  usePlannerActivities,
  useCreateActivity,
  useUpdateActivity,
  useDeleteActivity,
} from "../../hooks/usePlanner";
import { useCombinedSessions } from "../../hooks/useCombinedSessions";

const PlannerPage = () => {
  const { profile } = useProfile();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState(null);
  const [activityMode, setActivityMode] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [customSubjects, setCustomSubjects] = useState([]);

  // State for removing recurring sessions
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [removedSessionIds, setRemovedSessionIds] = useState(new Set());

  const rangeFrom = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
  const rangeTo = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString();

  const { activities, isLoading: isLoadingSessions, error: fetchError, refetch } = usePlannerActivities({
    from: rangeFrom,
    to: rangeTo,
  });

  const { groupSessions } = useCombinedSessions();

  // Merge group sessions into planner activities list
  const mergedActivities = useMemo(() => {
    const plannerList = activities || [];
    if (!groupSessions || groupSessions.length === 0) return plannerList;

    const formattedGroupItems = groupSessions.map((gs) => ({
      id: `group-${gs.id}`,
      original_group_session_id: gs.id,
      title: gs.title,
      subject: gs.subject,
      date: gs.Date,
      startTime: gs.Start,
      duration: gs.duration_minutes,
      type: "group_session",
      activityType: "session",
      is_group_session: true,
      group_id: gs.group_id,
      group_name: gs.group_name,
      user_rsvp: gs.user_rsvp,
      going_count: gs.going_count,
      color: "bg-cyan-600",
      status: gs.session_status,
    }));

    return [...plannerList, ...formattedGroupItems];
  }, [activities, groupSessions]);

  // Filter out optimistically deleted activities
  const visibleActivities = useMemo(() => {
    if (removedSessionIds.size === 0) return mergedActivities;
    return mergedActivities.filter((act) => {
      const key = act.activityId || act.id;
      return !removedSessionIds.has(key);
    });
  }, [mergedActivities, removedSessionIds]);

  const { createActivity, isSaving: isCreating } = useCreateActivity();
  const { updateActivity, isSaving: isUpdating } = useUpdateActivity();
  const { deleteActivity } = useDeleteActivity();

  const isSavingSession = isCreating || isUpdating;

  const defaultSubjects = [
    "Mathematics",
    "Chemistry",
    "Physics",
    "Biology",
    "English",
    "History",
    "Computer Science",
  ];
  const allSubjects = Array.from(
    new Set([...(profile?.subjects?.length ? profile.subjects : defaultSubjects), ...customSubjects])
  );

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const navigateWeek = (direction) => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + direction * 7);
    setCurrentDate(nextDate);
    setSelectedDate(nextDate);
  };

  const setPlannerDate = (event) => {
    const [year, month, day] = event.target.value.split("-").map(Number);
    const nextDate = new Date(year, month - 1, day);
    setSelectedDate(nextDate);
    setCurrentDate(nextDate);
  };

  const formatWeekRange = () => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endLabel = end.toLocaleDateString("en-US", {
      month: start.getMonth() === end.getMonth() ? undefined : "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startLabel} - ${endLabel}`;
  };

  const handleAddActivity = (date, mode = "session") => {
    setSelectedDate(date || new Date());
    setEditingActivity(null);
    setActivityMode(mode);
  };

  const handleEditActivity = (activity) => {
    if (activity.is_group_session) return; // Disallow editing group sessions in planner
    setEditingActivity(activity);
    let mode = "session";
    if (activity.type === "time_block") mode = "timeblock";
    else if (activity.type === "deadline") mode = "deadline";
    else if (activity.isRecurring) mode = "recurring";

    setActivityMode(mode);
  };

  const handleFormSubmit = async (formData, scope = "all") => {
    try {
      if (editingActivity) {
        await updateActivity(editingActivity.id, formData, scope);
        showToast("Activity updated in your planner");
      } else {
        await createActivity(formData);
        showToast("Session added to your planner");
      }
      setActivityMode(null);
      setEditingActivity(null);
      refetch();
    } catch (err) {
      console.error("Save error:", err);
      showToast("Failed to save activity: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteActivity = async (id, scope = "all", ruleId = null, dateStr = null) => {
    try {
      await deleteActivity(id, scope, ruleId, dateStr);
      showToast("Activity deleted");
      setActivityMode(null);
      setEditingActivity(null);
      setSelectedSession(null);
      refetch();
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Failed to delete activity");
    }
  };

  const handleRequestRemoveRecurring = (session) => {
    setSessionToDelete(session);
  };

  const handleUpdateRecurringFrequency = async (id, newFrequency) => {
    try {
      await updateActivity(id, { recurring_frequency: newFrequency }, "all");
      showToast("Recurring frequency updated");
      refetch();
    } catch (err) {
      console.error("Update frequency error:", err);
      showToast("Failed to update frequency");
    }
  };

  const confirmRemoveRecurring = async () => {
    if (!sessionToDelete) return;

    const targetId = sessionToDelete.activityId || sessionToDelete.id;
    setIsDeletingSession(true);

    // Optimistic removal from view
    setRemovedSessionIds((prev) => new Set(prev).add(targetId));

    try {
      await deleteActivity(targetId, "all");
      showToast("Recurring session removed");
      setSessionToDelete(null);
      refetch();
    } catch (err) {
      console.error("Delete recurring error:", err);
      // Restore card on failure
      setRemovedSessionIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
      showToast("Couldn't remove session. Try again.");
    } finally {
      setIsDeletingSession(false);
    }
  };

  const handleDuplicateActivity = (activity) => {
    if (activity.is_group_session) return;
    setEditingActivity(null);
    const duplicateData = {
      ...activity,
      id: undefined,
      title: `${activity.title} (Copy)`,
    };
    setEditingActivity(duplicateData);
    setActivityMode(activity.type === "time_block" ? "timeblock" : activity.isRecurring ? "recurring" : "session");
  };

  const handleMarkStatus = async (activityId, newStatus) => {
    try {
      await updateActivity(activityId, { status: newStatus }, "this_only");
      showToast(`Session marked as ${newStatus}`);
      refetch();
    } catch (err) {
      console.error("Status update error:", err);
      showToast("Failed to update status");
    }
  };

  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
      <LoadingCompanion message="Loading your study planner..." />
      <p className="text-gray-400 text-sm">Getting your sessions ready</p>
    </div>
  );

  return (
    <PageContainer maxWidth="max-w-7xl">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[120] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-overlay animate-fade-in dark:bg-white dark:text-slate-900">
          <CheckCircle className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 truncate text-2xl font-bold text-gray-900 lg:text-3xl dark:text-white">
            <CalendarDays className="h-6 w-6 shrink-0 text-blue-600" />
            Study Planner
          </h1>
          <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-400">
            Plan your week and track progress
          </p>
        </div>
        <button
          onClick={() => handleAddActivity(selectedDate)}
          className="hidden min-h-11 shrink-0 items-center space-x-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-button-primary hover:bg-orange-600 disabled:opacity-50 lg:inline-flex"
          disabled={isLoadingSessions}
        >
          <Plus className="w-4 h-4" />
          <span>Create new</span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => handleAddActivity(selectedDate)}
        disabled={isLoadingSessions}
        className="mb-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-button-primary hover:bg-orange-600 disabled:opacity-50 lg:hidden"
      >
        <Plus className="h-4 w-4" />
        Create new
      </button>

      <div className="mb-6">
        <NotificationPromptCard userId={profile?.user_id} />
      </div>

      {fetchError && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-xl shadow-surface dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-center justify-between">
            <span>{fetchError}</span>
            <button onClick={() => refetch()} className="text-red-800 hover:text-red-900 font-bold underline">
              Retry
            </button>
          </div>
        </div>
      )}

      {isLoadingSessions ? (
        <LoadingSpinner />
      ) : (
        <>
          <PlannerStatsBar />
          <DeadlineManager
            sessions={visibleActivities}
            onAddActivity={() => handleAddActivity(selectedDate, "deadline")}
          />

          <div className="mb-6 rounded-2xl bg-slate-50 p-2 sm:bg-white sm:py-2 dark:bg-slate-900 shadow-surface">
            <div className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setCurrentDate(today);
                  setSelectedDate(today);
                }}
                className="min-h-11 shrink-0 rounded-full bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 sm:text-sm"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => navigateWeek(-1)}
                title="Previous week"
                aria-label="Previous week"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 transition hover:text-slate-900 shadow-surface dark:bg-slate-900 dark:text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigateWeek(1)}
                title="Next week"
                aria-label="Next week"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 transition hover:text-slate-900 shadow-surface dark:bg-slate-900 dark:text-slate-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <h2 className="min-w-0 flex-1 text-center text-sm font-bold text-slate-900 sm:text-xl dark:text-white">
                {formatWeekRange()}
              </h2>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <label className="inline-flex min-w-0 items-center justify-center gap-1 rounded-full bg-white px-2 py-2 text-xs text-slate-600 shadow-surface sm:gap-2 sm:px-4 sm:text-sm dark:bg-slate-800 dark:text-slate-300">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                <span className="sr-only">Select date</span>
                <input
                  type="date"
                  value={selectedDate.toISOString().slice(0, 10)}
                  onChange={setPlannerDate}
                  className="min-w-0 w-full bg-transparent text-[10px] font-semibold text-slate-700 outline-none sm:text-xs dark:text-slate-200"
                />
              </label>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-full bg-white px-2 py-2 text-xs font-semibold text-slate-600 shadow-surface transition hover:bg-slate-50 sm:gap-2 sm:px-4 sm:text-sm dark:bg-slate-800 dark:text-slate-300"
              >
                <Filter className="h-4 w-4 text-slate-500" />
                Filter
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-full bg-white px-2 py-2 text-xs font-semibold text-slate-600 shadow-surface transition hover:bg-slate-50 sm:gap-2 sm:px-4 sm:text-sm dark:bg-slate-800 dark:text-slate-300"
              >
                <Timer className="h-4 w-4 text-slate-500" />
                Focus
              </button>
            </div>
          </div>

          <div>
            <Calendar
              currentDate={currentDate}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              sessions={visibleActivities}
              handleDrop={() => {}}
              setSelectedSession={setSelectedSession}
              selectedSession={selectedSession}
              onAddActivity={handleAddActivity}
              onEditActivity={handleEditActivity}
              onMarkStatus={handleMarkStatus}
            />
          </div>

          <div className="mb-6 flex flex-col gap-4">
            <RecurringSetup
              sessions={visibleActivities}
              onUpdateRecurring={handleUpdateRecurringFrequency}
              onRequestRemove={handleRequestRemoveRecurring}
              onAddActivity={() => handleAddActivity(selectedDate, "recurring")}
            />
            <TimeBlocking
              blockedTimes={visibleActivities.filter((a) => a.type === "time_block")}
              onAddActivity={() => handleAddActivity(selectedDate, "timeblock")}
              onDeleteBlock={(id) => handleDeleteActivity(id, "all")}
            />
          </div>
          <ExternalCalendarSync sessions={visibleActivities} />
        </>
      )}

      <PlannerActivityModal
        mode={activityMode}
        initialData={editingActivity}
        subjects={allSubjects}
        onAddSubject={(newSub) => setCustomSubjects((prev) => [...prev, newSub])}
        isSaving={isSavingSession}
        onClose={() => {
          setActivityMode(null);
          setEditingActivity(null);
        }}
        onSubmit={handleFormSubmit}
        onDelete={handleDeleteActivity}
        onDuplicate={handleDuplicateActivity}
      />

      {/* Confirmation Modal for removing recurring session */}
      <Modal
        isOpen={Boolean(sessionToDelete)}
        onClose={() => !isDeletingSession && setSessionToDelete(null)}
        title="Remove recurring session?"
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => !isDeletingSession && setSessionToDelete(null)}
              disabled={isDeletingSession}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmRemoveRecurring}
              disabled={isDeletingSession}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
            >
              {isDeletingSession && <Loader2 className="h-4 w-4 animate-spin" />}
              {isDeletingSession ? "Removing..." : "Remove"}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Remove recurring session? This will delete{" "}
          <span className="font-bold text-slate-900 dark:text-white">
            '{sessionToDelete?.title}'
          </span>{" "}
          and all future repeats.
        </p>
      </Modal>
    </PageContainer>
  );
};

export default PlannerPage;
