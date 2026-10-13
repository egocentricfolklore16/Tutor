import React, { useMemo } from 'react';
import { Plus, Play, Pause, Repeat, Check, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ResponsiveSheet from '../common/ResponsiveSheet';
import { useProfile } from '../../app/ProfileContext';
import { isPreferredStudyDay } from '../../lib/studyDays.js';

const GRID_BORDER_COLOR = 'border-white/[0.06]';

const Calendar = ({
  currentDate,
  sessions,
  handleDrop,
  setSelectedSession,
  selectedSession,
  onAddActivity,
  onEditActivity,
  onMarkStatus,
}) => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const isDeadline = (session) => session?.activityType === "deadline" || session?.type === "deadline";

  // Pre-index sessions by both `${dateString}-${hour}` and `${dateString}` in a single O(N) pass using useMemo.
  const { sessionsByDateAndHour, sessionsByDate } = useMemo(() => {
    const hourMap = new Map();
    const dateMap = new Map();
    if (!Array.isArray(sessions)) return { sessionsByDateAndHour: hourMap, sessionsByDate: dateMap };

    for (const session of sessions) {
      if (!session || !session.date) continue;
      const dateKey = new Date(session.date).toDateString();
      const deadline = isDeadline(session);
      const startHour = deadline
        ? 8
        : parseInt((session.startTime || "09:00").split(":")[0], 10);

      const hourKey = `${dateKey}-${startHour}`;
      let hourGroup = hourMap.get(hourKey);
      if (!hourGroup) {
        hourGroup = [];
        hourMap.set(hourKey, hourGroup);
      }
      hourGroup.push(session);

      let dateGroup = dateMap.get(dateKey);
      if (!dateGroup) {
        dateGroup = [];
        dateMap.set(dateKey, dateGroup);
      }
      dateGroup.push(session);
    }
    return { sessionsByDateAndHour: hourMap, sessionsByDate: dateMap };
  }, [sessions]);

  const renderSessionItem = (session, compact = false) => {
    const deadline = isDeadline(session);
    const isOpen = selectedSession?.id === session.id;
    const isPaused = session.status === "paused";
    const isCompleted = session.status === "completed";

    return (
      <div key={session.id || session.title} className="relative group">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedSession?.(isOpen ? null : session);
          }}
          className={`w-full mx-0.5 cursor-pointer rounded-md p-1.5 text-left text-xs text-white transition hover:brightness-95 shadow-xs overflow-hidden ${
            deadline ? "bg-red-600" : session.color || "bg-blue-600"
          } ${compact ? "mb-1" : ""} ${isCompleted ? "opacity-60 line-through" : ""}`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 min-w-0">
              {session.isRecurring && <Repeat className="h-3 w-3 shrink-0 opacity-80" />}
              <span className="block truncate font-bold">{deadline ? "Deadline" : session.title}</span>
            </div>
            {isCompleted && <Check className="h-3 w-3 shrink-0 text-emerald-200" />}
            {!deadline && isPaused && (
              <span className="shrink-0 rounded bg-black/40 px-1 py-0.2 text-[9px] font-bold text-amber-200">
                Paused
              </span>
            )}
          </div>
          {!compact && (
            <div className="mt-0.5 flex items-center justify-between text-[10px] opacity-90 truncate">
              <span className="truncate">{session.subject || session.type}</span>
              <span className="shrink-0 ml-1">{session.startTime}</span>
            </div>
          )}
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
    const selectedDaySessions = sessionsByDate.get(currentDate.toDateString()) || [];

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
                    ? "bg-blue-950/50 text-blue-300 font-bold border border-blue-800/50"
                    : "bg-slate-800/50 text-slate-300 hover:bg-slate-800"
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
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
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
    const todayStr = new Date().toDateString();

    return (
      <div className="hidden md:grid w-full min-w-[720px] md:min-w-0 grid-cols-[56px_repeat(7,minmax(0,1fr))]">
        {/* Header Row */}
        <div className="pb-3 text-[11px] font-normal text-white/40 flex items-end">Time</div>
        {weekDays.map((day) => {
          const isTargetDay = isPreferredStudyDay(day, profile?.study_days);
          const isToday = day.toDateString() === todayStr;
          return (
            <div
              key={day.toDateString()}
              className={`pb-3 px-1 text-center border-l ${GRID_BORDER_COLOR} ${isToday ? 'bg-emerald-500/[0.04]' : ''}`}
            >
              <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-white/60 uppercase tracking-wider">
                <span>{day.toLocaleDateString("en-US", { weekday: "short" })}</span>
                {isTargetDay && (
                  <span
                    title="Target study day"
                    className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                  />
                )}
              </div>
              <div
                className={`mt-0.5 text-lg font-bold ${
                  isToday ? "text-emerald-400" : "text-white/90"
                }`}
              >
                {day.getDate()}
              </div>
              <button
                type="button"
                onClick={() => onAddActivity(new Date(day))}
                className="mt-2 inline-flex w-full items-center justify-center gap-1 bg-white/[0.05] hover:bg-white/10 text-[12px] font-medium text-white/80 rounded-lg py-1.5 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
          );
        })}

        {/* Hourly Rows */}
        {[...Array(12)].map((_, hour) => {
          const slotHour = hour + 8;
          const time = `${slotHour.toString().padStart(2, "0")}:00`;
          return (
            <React.Fragment key={time}>
              <div className={`text-[11px] font-normal text-white/40 pt-1.5 pr-2 text-right border-t ${GRID_BORDER_COLOR}`}>
                {time}
              </div>
              {weekDays.map((day) => {
                const isToday = day.toDateString() === todayStr;
                const key = `${day.toDateString()}-${slotHour}`;
                const daySession = sessionsByDateAndHour.get(key) || [];
                return (
                  <div
                    key={`${day.toDateString()}-${time}`}
                    className={`group relative border-t border-l ${GRID_BORDER_COLOR} p-1 min-h-14 hover:bg-white/[0.04] cursor-pointer transition-colors duration-150 ${
                      isToday ? 'bg-emerald-500/[0.04]' : 'bg-transparent'
                    }`}
                    onClick={() => {
                      const slotDate = new Date(day);
                      slotDate.setHours(slotHour, 0, 0, 0);
                      onAddActivity(slotDate, "session");
                    }}
                    onDrop={(e) => handleDrop(e, day)}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {daySession.map((session) => renderSessionItem(session, true))}
                    {daySession.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Plus className="h-3.5 w-3.5 text-white/30" />
                      </div>
                    )}
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
    <div className="relative mb-6 overflow-x-auto rounded-2xl bg-slate-900 border border-white/[0.08] overflow-hidden p-3 md:p-6 [scrollbar-width:thin] [::-webkit-scrollbar]:w-1.5 [::-webkit-scrollbar]:h-1.5">
      {renderMobileDayView()}
      {renderWeekView()}
      <img src="/logo3.png" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 h-10 w-10 object-contain opacity-20" />

      {/* Selected Session Detail Sheet */}
      <ResponsiveSheet
        isOpen={Boolean(selectedSession)}
        onClose={() => setSelectedSession?.(null)}
        title={isDeadline(selectedSession || {}) ? "Deadline Details" : "Activity Details"}
      >
        {selectedSession && (
          <div className="space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider ${isDeadline(selectedSession) ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
                  {isDeadline(selectedSession) ? "Deadline" : selectedSession.type || "Study Session"}
                </p>
                <h3 className="mt-1 text-lg font-bold">{selectedSession.title}</h3>
              </div>
              {onEditActivity && (
                <button
                  type="button"
                  onClick={() => {
                    const sessionToEdit = selectedSession;
                    setSelectedSession?.(null);
                    onEditActivity(sessionToEdit);
                  }}
                  className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Edit2 size={16} />
                </button>
              )}
            </div>

            <dl className="space-y-2.5 text-sm border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Subject</dt><dd className="font-semibold text-right">{selectedSession.subject || "-"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Status</dt><dd className="font-semibold text-right capitalize">{selectedSession.status || "Scheduled"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Date</dt><dd className="font-semibold text-right">{new Date(selectedSession.date).toLocaleDateString()}</dd></div>
              {!isDeadline(selectedSession) && <div className="flex justify-between gap-3"><dt className="text-slate-500">Time</dt><dd className="font-semibold text-right">{selectedSession?.startTime || "09:00"}</dd></div>}
              {!isDeadline(selectedSession) && <div className="flex justify-between gap-3"><dt className="text-slate-500">Duration</dt><dd className="font-semibold text-right">{selectedSession.duration} minutes</dd></div>}
              {selectedSession.isRecurring && <div className="flex justify-between gap-3"><dt className="text-slate-500">Repeats</dt><dd className="font-semibold capitalize text-right">Recurring series</dd></div>}
              {selectedSession.notes && <div className="border-t border-slate-100 pt-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400"><dt className="font-bold mb-1">Notes</dt><dd>{selectedSession.notes}</dd></div>}
            </dl>

            <div className="pt-2 flex gap-2">
              {onMarkStatus && (
                <button
                  type="button"
                  onClick={() => {
                    const newStatus = selectedSession.status === "completed" ? "scheduled" : "completed";
                    onMarkStatus(selectedSession.id, newStatus);
                    setSelectedSession?.(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition ${
                    selectedSession.status === "completed"
                      ? "bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  <Check className="h-4 w-4" />
                  {selectedSession.status === "completed" ? "Mark incomplete" : "Mark complete"}
                </button>
              )}

              {!isDeadline(selectedSession) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSession?.(null);
                    navigate(`/Study/${selectedSession.id}`);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-3 text-xs font-bold text-white transition hover:bg-blue-700"
                >
                  {selectedSession.status === "paused" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                  {selectedSession.status === "paused" ? "Resume" : "Start"}
                </button>
              )}
            </div>
          </div>
        )}
      </ResponsiveSheet>
    </div>
  );
};

export default Calendar;
