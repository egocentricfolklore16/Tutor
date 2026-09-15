import React, { useState, useEffect } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CalendarDays,
  Filter,
  Loader2,
  Timer,
} from "lucide-react";
import supabase from "../../lib/supabase";
import Calendar from "./Calendar";
import PlannerActivityModal from "./PlannerActivityModal";
import DeadlineManager from "./DeadlineManager";
import PlannerStatsBar from "./PlannerStatsBar";
import RecurringSetup from "./RecurringSetup";
import TimeBlocking from "./TimeBlocking";
import ExternalCalendarSync from "./ExternalCalendarSync";
import { useProfile } from "../../app/ProfileContext";
import LoadingCompanion from "../common/LoadingCompanion";
import { getNotificationPreferences, recordNotification, scheduleSessionRemindersFromSessions, scheduleStudyReminder } from "../../lib/notifications";

const PlannerPage = () => {
  const { profile } = useProfile();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [draggedSession, setDraggedSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [activityMode, setActivityMode] = useState(null);
  const [blockedTimes, setBlockedTimes] = useState([
  ]);

  const [newSession, setNewSession] = useState({
    title: "",
    subject: "",
    type: "study",
    status: "medium",
    date: selectedDate,
    startTime: "09:00",
    duration: 60,
    recurring: "none",
    reminder: 15,
    purpose: "",
    blockStart: "09:00",
    blockEnd: "11:00",
  });

  const defaultSubjects = [
    "Mathematics",
    "Chemistry",
    "Physics",
    "Biology",
    "English",
    "History",
    "Computer Science",
  ];
  const subjects = profile?.subjects?.length ? profile.subjects : defaultSubjects;
  useEffect(() => {
    if (!profile) return;
    const preferredStart = { Morning: "08:00", Afternoon: "13:00", Evening: "18:00" }[profile.preferred_time] || "09:00";
    setNewSession((current) => ({
      ...current,
      startTime: preferredStart,
      duration: profile.weekly_hours ? Math.round(Math.min(24, Math.max(0.25, Number((profile.weekly_hours / Math.max(profile.study_days?.length || 3, 3)).toFixed(2)))) * 60) : current.duration,
    }));
  }, [profile]);

  // Fetch study sessions from Supabase
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoadingSessions(true);
        setFetchError("");

        // Get the current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setFetchError("User not authenticated");
          return;
        }

        const { data, error } = await supabase
          .from("Study")
          .select('id,Subject,Topic,Status,Date,"Start",Duration,recurring,reminder_minutes,deadline,activity_type')
          .eq("user_id", user.id); // Filter by current user's ID

        const { data: timeBlockData, error: timeBlockError } = await supabase
          .from("time_blocks")
          .select("id,block_date,start_time,end_time,purpose")
          .eq("user_id", user.id)
          .order("block_date", { ascending: true });

        if (timeBlockError) {
          console.error("Error fetching time blocks:", timeBlockError);
          if (timeBlockError.code === "PGRST205") {
            setFetchError("Planner database setup is incomplete. Run supabase/014_planner_activity_fields.sql in Supabase SQL Editor.");
          }
        }
        else setBlockedTimes(timeBlockData.map((block) => ({
          id: block.id,
          day: new Date(block.block_date).toLocaleDateString("en-US", { weekday: "long" }),
          start: block.start_time,
          end: block.end_time,
          purpose: block.purpose,
        })));

        if (error) {
          const missingPlannerFields = error.code === "42703" || error.message?.includes("column");
          setFetchError(missingPlannerFields
            ? "Planner database fields are missing. Run supabase/014_planner_activity_fields.sql in Supabase SQL Editor."
            : "Error loading study sessions: " + error.message);
          console.error("Error fetching study sessions:", error);
        } else {
            const mappedSessions = data.map((session) => {
            let color = "bg-blue-500";
            switch (session.Status?.trim().toLowerCase()) {
              case "very important":
                color = "bg-red-300";
                break;
              case "not so important":
                color = "bg-green-300";
                break;
              case "medium":
                color = "bg-orange-300";
                break;
              default:
                color = "bg-blue-500";
            }
            return {
              id: session.id,
              title: session.Topic,
              subject: session.Subject,
              type: "study",
              date: new Date(session.Date),
              startTime: session.Start,
              endTime: calculateEndTime(session.Start, session.Duration),
              duration: session.Duration,
              recurring: session.recurring || "none",
              reminder: session.reminder_minutes ?? 15,
              deadline: session.deadline,
              activityType: session.activity_type || "study",
              color,
            };
          });
          setSessions(mappedSessions);
          scheduleSessionRemindersFromSessions(mappedSessions, getNotificationPreferences());
          setFetchError("");
        }
      } catch (err) {
        setFetchError("An unexpected error occurred while loading sessions");
        console.error("Unexpected error:", err);
      } finally {
        setIsLoadingSessions(false);
      }
    };
    fetchSessions();
  }, []);

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
    const endLabel = end.toLocaleDateString("en-US", { month: start.getMonth() === end.getMonth() ? undefined : "short", day: "numeric", year: "numeric" });
    return `${startLabel} - ${endLabel}`;
  };

  const handleDragStart = (event, session) => setDraggedSession(session);

  const handleDrop = (event, targetDate) => {
    event.preventDefault();
    if (!draggedSession) return;
    supabase.from("Study").update({ Date: targetDate }).eq("id", draggedSession.id).then(({ error }) => {
      if (error) setFetchError("Failed to move session: " + error.message);
    });
    setSessions((prev) => prev.map((session) => session.id === draggedSession.id ? { ...session, date: new Date(targetDate) } : session));
    setDraggedSession(null);
  };

  const handleCreateSession = async () => {
    if (!newSession.title.trim() || !newSession.subject || !newSession.status || !newSession.date) return;
    setIsSavingSession(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setFetchError("User not authenticated");
      setIsSavingSession(false);
      return;
    }
    const { data, error } = await supabase.from("Study").insert([{
      Subject: newSession.subject,
      Topic: newSession.title.trim(),
      Status: newSession.status,
      Date: newSession.date,
      Start: newSession.startTime,
      Duration: Number(newSession.duration) / 60,
      recurring: newSession.recurring,
      reminder_minutes: newSession.reminder,
      deadline: activityMode === "deadline" ? newSession.date : null,
      activity_type: activityMode === "deadline" ? "deadline" : "study",
      muted: false,
      user_id: user.id,
    }]).select("id,Subject,Topic,Status,Date,Start,Duration,recurring,reminder_minutes,deadline,activity_type").single();
    if (error) {
      setFetchError("Failed to create session: " + error.message);
    } else {
      const nextSession = {
        id: data.id, title: data.Topic, subject: data.Subject, type: "study", status: data.Status,
        date: new Date(data.Date), startTime: data.Start, endTime: calculateEndTime(data.Start, data.Duration),
        duration: data.Duration, recurring: data.recurring || "none", reminder: data.reminder_minutes ?? 15,
        deadline: data.deadline, activityType: data.activity_type || "study",
        color: data.Status === "very important" ? "bg-red-300" : data.Status === "not so important" ? "bg-green-300" : "bg-orange-300",
      };

      setSessions((prev) => [...prev, nextSession]);
      scheduleStudyReminder(nextSession, getNotificationPreferences());

      const preferences = getNotificationPreferences();
      const notificationBody = `${data.Topic} is scheduled for ${new Date(data.Date).toLocaleDateString()} at ${data.Start}.`;
      recordNotification({
        title: "Study session saved",
        body: notificationBody,
        type: "studyReminders",
        context: "planner",
      }, preferences);

      setNewSession({ title: "", subject: "", status: "medium", date: selectedDate, startTime: "09:00", duration: 60, recurring: "none", reminder: 15, purpose: "", blockStart: "09:00", blockEnd: "11:00" });
      setActivityMode(null);
    }
    setIsSavingSession(false);
  };

  const handleAddActivity = (date, mode = "session") => {
    setSelectedDate(date);
    setNewSession((current) => ({ ...current, date }));
    setActivityMode(mode);
  };

  const handleCreateActivity = async () => {
    if (activityMode === "session" || activityMode === "recurring") {
      await handleCreateSession();
      setActivityMode(null);
      return;
    }

    if (activityMode === "deadline") {
      await handleCreateSession();
    } else if (activityMode === "timeblock") {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("time_blocks").insert({
        user_id: user?.id,
        block_date: newSession.date,
        start_time: newSession.blockStart,
        end_time: newSession.blockEnd,
        purpose: newSession.purpose.trim(),
      }).select("id,block_date,start_time,end_time,purpose").single();

      if (error) {
        setFetchError("Failed to create time block: " + error.message);
        return;
      }

      setBlockedTimes((prev) => [...prev, {
        id: data.id,
        day: new Date(data.block_date).toLocaleDateString("en-US", { weekday: "long" }),
        start: data.start_time,
        end: data.end_time,
        purpose: data.purpose,
      }]);
    }

    setActivityMode(null);
  };

  const handleDeleteTimeBlock = async (id) => {
    const { error } = await supabase.from("time_blocks").delete().eq("id", id);
    if (error) {
      setFetchError("Failed to delete time block: " + error.message);
      return;
    }
    setBlockedTimes((prev) => prev.filter((block) => block.id !== id));
  };

  const handleUpdateRecurring = async (sessionId, recurring) => {
    const { error } = await supabase.from("Study").update({ recurring }).eq("id", sessionId);
    if (error) {
      setFetchError("Failed to update recurring session: " + error.message);
      return;
    }
    setSessions((prev) => prev.map((session) => session.id === sessionId ? { ...session, recurring } : session));
  };

  const calculateEndTime = (startTime, duration) => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const endDate = new Date();
    endDate.setHours(hours, minutes + Number(duration) * 60);
    return endDate.toTimeString().slice(0, 5);
  };

  // Loading component
  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
      <LoadingCompanion message="Loading your study planner..." />
      <p className="text-gray-400 text-sm">Getting your sessions ready</p>
    </div>
  );

  return (
    <div className="min-h-screen max-w-7xl bg-white px-3 py-5 sm:px-4 sm:py-6 md:mx-auto md:px-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 truncate text-2xl font-bold text-gray-900 lg:text-3xl"><CalendarDays className="h-6 w-6 shrink-0 text-blue-600" />Study Planner</h1>
          <p className="mt-1 truncate text-sm text-gray-600">Plan your week and track progress</p>
        </div>
        <button
          onClick={() => handleAddActivity(selectedDate)}
          className="hidden min-h-11 shrink-0 items-center space-x-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed sm:inline-flex"
          disabled={isLoadingSessions}
        >
          <Plus className="w-4 h-4" />
          <span>+ Create new</span>
        </button>
      </div>
      <button type="button" onClick={() => handleAddActivity(selectedDate)} disabled={isLoadingSessions} className="mb-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 sm:hidden"><Plus className="h-4 w-4" />+ Create new</button>

      {/* Error Message */}
      {fetchError && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">
          <div className="flex items-center justify-between">
            <span>{fetchError}</span>
            <button
              onClick={() => setFetchError("")}
              className="text-red-800 hover:text-red-900"
            >
              <span className="sr-only">Close</span>×
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoadingSessions ? (
        <LoadingSpinner />
      ) : (
        <>
          <PlannerStatsBar />
          {/* Controls */}
          <DeadlineManager sessions={sessions} onAddActivity={() => handleAddActivity(selectedDate, "deadline")} />
          <div className="mb-6 rounded-2xl bg-slate-50 p-2 sm:bg-white sm:py-2">
            <div className="flex min-w-0 items-center gap-1">
              <button type="button" onClick={() => { const today = new Date(); setCurrentDate(today); setSelectedDate(today); }} className="min-h-11 shrink-0 rounded-full bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100">Today</button>
              <button type="button" onClick={() => navigateWeek(-1)} title="Previous week" aria-label="Previous week" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={() => navigateWeek(1)} title="Next week" aria-label="Next week" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"><ChevronRight className="h-5 w-5" /></button>
              <h2 className="min-w-0 flex-1 text-center text-sm font-bold text-slate-900 sm:text-xl">{formatWeekRange()}</h2>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
            <label className="inline-flex min-w-0 items-center justify-center gap-1 rounded-full bg-white px-2 py-2 text-xs text-slate-600 shadow-sm sm:gap-2 sm:px-4 sm:text-sm">
              <CalendarDays className="h-4 w-4 text-slate-500" /><span className="sr-only">Select date</span>
              <input type="date" value={selectedDate.toISOString().slice(0, 10)} onChange={setPlannerDate} className="min-w-0 w-full bg-transparent text-[10px] font-semibold text-slate-700 outline-none sm:w-[125px] sm:text-sm" />
            </label>
            <button type="button" className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-full bg-white px-2 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 sm:gap-2 sm:px-4 sm:text-sm"><Timer className="h-4 w-4" />Focus</button>
            <button type="button" className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-full bg-white px-2 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 sm:gap-2 sm:px-4 sm:text-sm"><Filter className="h-4 w-4" />Filters</button>
            </div>
          </div>

          {/* Calendar and Details */}
          <div>
              <Calendar
                currentDate={currentDate}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                sessions={sessions}
                handleDragStart={handleDragStart}
                handleDrop={handleDrop}
                setSelectedSession={setSelectedSession}
                selectedSession={selectedSession}
                onAddActivity={handleAddActivity}
              />
          </div>

          {/* Quick Actions */}
          <div className="mb-6 flex flex-col gap-4">
            <RecurringSetup sessions={sessions} onUpdateRecurring={handleUpdateRecurring} onAddActivity={() => handleAddActivity(selectedDate, "recurring")} />
            <TimeBlocking blockedTimes={blockedTimes} onAddActivity={() => handleAddActivity(selectedDate, "timeblock")} onDeleteBlock={handleDeleteTimeBlock} />
          </div>
          <ExternalCalendarSync sessions={sessions} />
        </>
      )}

      {/* Session Scheduler Modal */}
      <PlannerActivityModal
        mode={activityMode}
        form={newSession}
        setForm={setNewSession}
        subjects={subjects}
        isSaving={isSavingSession}
        onClose={() => setActivityMode(null)}
        onSubmit={handleCreateActivity}
      />
    </div>
  );
};

export default PlannerPage;
