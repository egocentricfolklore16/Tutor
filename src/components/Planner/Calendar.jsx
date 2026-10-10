import React, { useMemo } from 'react';
import { Plus, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ResponsiveSheet from '../common/ResponsiveSheet';
import { useProfile } from '../../app/ProfileContext';
import { isPreferredStudyDay } from '../../lib/studyDays.js';

const Calendar = ({
  currentDate,
  sessions,
  handleDrop,
  setSelectedSession,
  selectedSession,
  onAddActivity,
}) => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const isDeadline = (session) => session.activityType === "deadline" || session.type === "deadline";

  // BOLT OPTIMIZATION:
  // Pre-index sessions by `${dateString}-${hour}` in O(N) time using useMemo.
  // This eliminates doing array filtering (O(N) * 12 hours * 7 days = 84 * N array iterations)
  // on every render in renderWeekView, reducing lookups to O(1) hash map access.
  const sessionsByDateAndHour = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(sessions)) return map;

    for (const session of sessions) {
      if (!session || !session.date) continue;
      const dateKey = session.date.toDateString();
      const deadline = isDeadline(session);
      const startHour = deadline
        ? 8
        : parseInt((session.startTime || "09:00").split(":")[0], 10);

      const key = `${dateKey}-${startHour}`;
      let group = map.get(key);
      if (!group) {
        group = [];
        map.set(key, group);
      }
      group.push(session);
    }
    return map;
  }, [sessions]);

  const renderSessionItem = (session, compact = false) => {
    const deadline = isDeadline(session);
    const isOpen = selectedSession?.id === session.id;
    const isPaused = session.sessionStatus === "paused";

    return (
      <div key={session.id} className="relative">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedSession?.(isOpen ? null : session);
          }}
          className={`w-full cursor-pointer rounded p-1 text-left text-xs text-white transition hover:brightness-95 ${deadline ? "bg-red-600" : session.color} ${compact ? "mb-1" : ""}`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="block truncate font-semibold">{deadline ? "Deadline" : session.title}</span>
            {!deadline && isPaused && (
              <span className="shrink-0 rounded bg-black/40 px-1 py-0.2 text-[9px] font-bold text-amber-200">
                Paused
              </span>
            )}
          </div>
          {!compact && deadline && <span className="block truncate">{session.title}</span>}
        </button>
      </div>
    );
  };

  const startOfWeek = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay());
    return start;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }, [startOfWeek]);

  const renderMobileDayView = () => {
    const selectedDaySessions = Array.from(sessionsByDateAndHour.values())
      .flat()
      .filter((s) => s?.date?.toDateString() === currentDate.toDateString());

    return (
      <div className="md:hidden space-y-4">
        {/* Mobile Day Selector Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
          {weekDays.map((day) => {
            const isSelected = day.toDateString() === currentDate.toDateString();
            const isToday = day.toDateString() === new Date().toDateString();
            const isTargetDay = isPreferredStudyDay(day, profile?.study_days);
            return (
              <button
                key={day.toDateString()}
                type="button"
                onClick={() => onAddActivity(new Date(day))}
                title={isTargetDay ? "Target study day" : undefined}
                className={`relative flex min-w-[48px] flex-col items-center rounded-2xl p-2.5 transition ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md font-bold"
                    : isToday
                    ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="text-[10px] uppercase">{day.toLocaleDateString("en-US", { weekday: "short" })}</span>
                <span className="text-base font-extrabold">{day.getDate()}</span>
                {isTargetDay && (
                  <span
                    aria-label="Target study day"
                    className={`mt-0.5 h-1.5 w-1.5 rounded-full ${isSelected ? "bg-emerald-300" : "bg-emerald-500"}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Day Agenda */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </h3>
            <button
              type="button"
              onClick={() => onAddActivity(new Date(currentDate))}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Activity
            </button>
          </div>

          {selectedDaySessions.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              No sessions scheduled for this day. Tap "Add Activity" to plan one.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedDaySessions.map((session) => renderSessionItem(session, false))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    return (
      <div className="hidden md:grid min-w-[1000px] grid-cols-8 gap-2 h-96">
        <div className="text-sm font-semibold text-gray-600">Time</div>
        {weekDays.map((day) => {
          const isTargetDay = isPreferredStudyDay(day, profile?.study_days);
          return (
            <div
              key={day.toDateString()}
              className="text-sm font-semibold text-gray-600 text-center"
            >
              <div className="flex items-center justify-center gap-1">
                <span>{day.toLocaleDateString("en-US", { weekday: "short" })}</span>
                {isTargetDay && (
                  <span
                    title="Target study day"
                    className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                  />
                )}
              </div>
              <div
                className={`text-lg ${
                  day.toDateString() === new Date().toDateString()
                    ? "text-blue-600 font-bold"
                    : ""
                }`}
              >
                {day.getDate()}
              </div>
              <button
                type="button"
                onClick={() => onAddActivity(new Date(day))}
                className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
          );
        })}

        {[...Array(12)].map((_, hour) => {
          const slotHour = hour + 8;
          const time = `${slotHour.toString().padStart(2, "0")}:00`;
          return (
            <React.Fragment key={time}>
              <div className="text-xs text-gray-500 py-2">{time}</div>
              {weekDays.map((day) => {
                const key = `${day.toDateString()}-${slotHour}`;
                const daySession = sessionsByDateAndHour.get(key) || [];
                return (
                  <div
                    key={`${day.toDateString()}-${time}`}
                    className="border border-gray-200 p-1 min-h-12"
                    onDrop={(e) => handleDrop(e, day)}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {daySession.map((session) => renderSessionItem(session, true))}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative mb-6 overflow-x-auto rounded-2xl bg-white p-3 md:p-6">
      {renderMobileDayView()}
      {renderWeekView()}
      <img src="/logo3.png" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 h-10 w-10 object-contain opacity-20" />

      {/* Selected Session Detail Sheet */}
      <ResponsiveSheet
        isOpen={Boolean(selectedSession)}
        onClose={() => setSelectedSession?.(null)}
        title={isDeadline(selectedSession || {}) ? "Deadline Details" : "Study Session Details"}
      >
        {selectedSession && (
          <div className="space-y-4 text-slate-900 dark:text-slate-100">
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${isDeadline(selectedSession) ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
                {isDeadline(selectedSession) ? "Deadline" : "Study Session"}
              </p>
              <h3 className="mt-1 text-lg font-bold">{selectedSession.title}</h3>
            </div>

            <dl className="space-y-2.5 text-sm border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Subject</dt><dd className="font-semibold text-right">{selectedSession.subject || "-"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Status</dt><dd className="font-semibold text-right">{selectedSession.sessionStatus === "paused" ? "Paused" : "Active / Scheduled"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Date</dt><dd className="font-semibold text-right">{selectedSession.date?.toLocaleDateString()}</dd></div>
              {!isDeadline(selectedSession) && <div className="flex justify-between gap-3"><dt className="text-slate-500">Time</dt><dd className="font-semibold text-right">{selectedSession?.startTime || "09:00"} - {selectedSession?.endTime || "10:00"}</dd></div>}
              {!isDeadline(selectedSession) && <div className="flex justify-between gap-3"><dt className="text-slate-500">Duration</dt><dd className="font-semibold text-right">{Number(selectedSession.duration || 0).toFixed(2).replace(/\.00$/, "")} hours</dd></div>}
              {selectedSession.recurring && selectedSession.recurring !== "none" && <div className="flex justify-between gap-3"><dt className="text-slate-500">Repeats</dt><dd className="font-semibold capitalize text-right">{selectedSession.recurring}</dd></div>}
            </dl>

            {!isDeadline(selectedSession) && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSession?.(null);
                    navigate(`/Study/${selectedSession.id}`);
                  }}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-bold text-slate-950 transition ${
                    selectedSession.sessionStatus === "paused" ? "bg-amber-400 hover:bg-amber-500" : "bg-emerald-400 hover:bg-emerald-500"
                  }`}
                >
                  {selectedSession.sessionStatus === "paused" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                  {selectedSession.sessionStatus === "paused" ? "Resume Session" : "Start Session"}
                </button>
              </div>
            )}
          </div>
        )}
      </ResponsiveSheet>
    </div>
  );
};

export default Calendar;
