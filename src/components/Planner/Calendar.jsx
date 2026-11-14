import React, { useMemo } from 'react';
import { Plus, Play, Pause, Repeat, Check, Edit2, Users, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ResponsiveSheet from '../common/ResponsiveSheet';
import { useProfile } from '../../app/ProfileContext';
import { isPreferredStudyDay } from '../../lib/studyDays.js';
import {
  getLocalDateKey,
  parseTime,
  formatTimeDisplay,
  getSessionDurationMinutes,
} from '../../lib/plannerUtils.js';

const GRID_BORDER_COLOR = 'border-slate-200 dark:border-slate-800';

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
  const isTimeBlock = (session) => session?.activityType === "time_block" || session?.type === "time_block";

  // Pre-index sessions by date-hour key and date key, tracking min/max hour range
  const { sessionsByDateAndHour, sessionsByDate, minHour, maxHour } = useMemo(() => {
    const hourMap = new Map();
    const dateMap = new Map();
    let calculatedMinHour = 8;
    let calculatedMaxHour = 19;

    if (!Array.isArray(sessions)) {
      return { sessionsByDateAndHour: hourMap, sessionsByDate: dateMap, minHour: 8, maxHour: 19 };
    }

    for (const session of sessions) {
      if (!session) continue;
      const rawDate = session.date || session.Date || session.block_date || session.due_date;
      if (!rawDate) continue;

      const dateKey = getLocalDateKey(rawDate);
      if (!dateKey) continue;

      const deadline = isDeadline(session);
      const rawTime = session.startTime || session.Start || session.start_time || session.time;
      const parsedTime = parseTime(rawTime);

      const startHour = deadline ? 8 : parsedTime.hour;

      if (startHour < calculatedMinHour) calculatedMinHour = Math.max(0, startHour);
      if (startHour > calculatedMaxHour) calculatedMaxHour = Math.min(23, startHour);

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

    return {
      sessionsByDateAndHour: hourMap,
      sessionsByDate: dateMap,
      minHour: calculatedMinHour,
      maxHour: calculatedMaxHour,
    };
  }, [sessions]);

  const renderSessionItem = (session, compact = false, styleProps = {}) => {
    const deadline = isDeadline(session);
    const timeBlock = isTimeBlock(session);
    const isOpen = selectedSession?.id === session.id;
    const isPaused = session.status === "paused";
    const isCompleted = session.status === "completed" || session.completed;

    const title = session.title || session.Topic || session.purpose || "Course";
    const subject = session.subject || session.Subject || (timeBlock ? "Time Block" : deadline ? "Deadline" : "General");
    const parsedTime = parseTime(session.startTime || session.Start || session.start_time || session.time);
    const timeLabel = formatTimeDisplay(parsedTime);

    return (
      <div
        key={session.id || `${title}-${getLocalDateKey(session.date || session.Date)}`}
        style={styleProps}
        className={compact ? "absolute z-10 group" : "relative group mb-1"}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedSession?.(isOpen ? null : session);
          }}
          className={`w-full h-full cursor-pointer rounded-xl p-2 text-left text-xs text-white transition hover:brightness-95 shadow-sm overflow-hidden flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 motion-reduce:transition-none ${
            deadline
              ? "bg-rose-500"
              : timeBlock
              ? "bg-slate-700 border border-slate-500 text-slate-100"
              : session.color || "bg-blue-600"
          } ${isCompleted ? "opacity-60 line-through" : ""}`}
        >
          <div className="flex items-start justify-between gap-1 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              {session.is_group_session ? (
                <Users className="h-3 w-3 shrink-0 opacity-90" />
              ) : session.isRecurring ? (
                <Repeat className="h-3 w-3 shrink-0 opacity-80" />
              ) : timeBlock ? (
                <ShieldAlert className="h-3 w-3 shrink-0 text-slate-300" />
              ) : null}
              <span className="block truncate font-bold text-xs leading-tight">
                {deadline ? "Deadline: " + title : timeBlock ? "Protected: " + title : title}
              </span>
            </div>
            {isCompleted && <Check className="h-3 w-3 shrink-0 text-emerald-200" />}
            {!deadline && !timeBlock && isPaused && (
              <span className="shrink-0 rounded-full bg-black/40 px-2 py-1 text-[9px] font-bold text-amber-200">
                Paused
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center justify-between text-[10px] opacity-90 truncate">
            <span className="truncate">{subject}</span>
            <span className="shrink-0 ml-1 font-medium">{timeLabel}</span>
          </div>
        </button>
      </div>
    );
  };

  const startOfWeek = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    start.setDate(start.getDate() - start.getDay());
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

  const hoursArray = useMemo(() => {
    const hours = [];
    for (let h = minHour; h <= maxHour; h++) {
      hours.push(h);
    }
    return hours;
  }, [minHour, maxHour]);

  const renderMobileDayView = () => {
    const currentDateKey = getLocalDateKey(currentDate);
    const selectedDaySessions = sessionsByDate.get(currentDateKey) || [];

    return (
      <div className="md:hidden space-y-4">
        {/* Mobile Day Selector Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {weekDays.map((day) => {
            const dayKey = getLocalDateKey(day);
            const isSelected = dayKey === currentDateKey;
            const isToday = dayKey === getLocalDateKey(new Date());
            const isTargetDay = isPreferredStudyDay(day, profile?.study_days);
            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => onAddActivity(new Date(day))}
                title={isTargetDay ? "Target study day" : undefined}
                className={`relative flex min-h-11 min-w-[48px] flex-col items-center rounded-xl p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 motion-reduce:transition-none ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-sm font-bold"
                    : isToday
                    ? "border border-emerald-200 bg-emerald-50 font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span className="text-[10px] uppercase">{day.toLocaleDateString("en-US", { weekday: "short" })}</span>
                <span className="text-base font-extrabold">{day.getDate()}</span>
                {isTargetDay && (
                  <span
                    aria-label="Target study day"
                    className={`mt-1 h-1.5 w-1.5 rounded-full ${isSelected ? "bg-emerald-300" : "bg-emerald-500"}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Day Agenda */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </h3>
            <button
              type="button"
              onClick={() => onAddActivity(new Date(currentDate))}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-emerald-500 dark:hover:bg-emerald-400 motion-reduce:transition-none"
            >
              <Plus className="h-4 w-4" />
              Add Activity
            </button>
          </div>

          {selectedDaySessions.length === 0 ? (
            <p className="py-6 text-center text-sm leading-6 text-slate-600 dark:text-slate-300">
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
    const todayKey = getLocalDateKey(new Date());

    return (
      <div className="hidden w-full min-w-[720px] grid-cols-[56px_repeat(7,minmax(0,1fr))] md:grid md:min-w-0">
        {/* Header Row */}
        <div className="flex items-end pb-3 text-[11px] font-normal text-slate-500 dark:text-slate-400">Time</div>
        {weekDays.map((day) => {
          const dayKey = getLocalDateKey(day);
          const isTargetDay = isPreferredStudyDay(day, profile?.study_days);
          const isToday = dayKey === todayKey;
          return (
            <div
              key={dayKey}
              className={`border-l px-1 pb-3 text-center ${GRID_BORDER_COLOR} ${isToday ? "bg-emerald-50/70 dark:bg-emerald-500/5" : ""}`}
            >
              <div className="flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
                  isToday ? "text-emerald-700 dark:text-emerald-300" : "text-slate-900 dark:text-slate-100"
                }`}
              >
                {day.getDate()}
              </div>
              <button
                type="button"
                onClick={() => onAddActivity(new Date(day))}
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 motion-reduce:transition-none"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          );
        })}

        {/* Hourly Rows */}
        {hoursArray.map((slotHour) => {
          const time = `${slotHour.toString().padStart(2, "0")}:00`;
          return (
            <React.Fragment key={time}>
              <div className={`border-t pt-2 pr-2 text-right text-[11px] font-normal text-slate-500 dark:text-slate-400 ${GRID_BORDER_COLOR}`}>
                {time}
              </div>
              {weekDays.map((day) => {
                const dayKey = getLocalDateKey(day);
                const isToday = dayKey === todayKey;
                const hourKey = `${dayKey}-${slotHour}`;
                const daySession = sessionsByDateAndHour.get(hourKey) || [];

                return (
                  <div
                    key={`${dayKey}-${time}`}
                    className={`group relative h-16 cursor-pointer border-t border-l transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${GRID_BORDER_COLOR} ${
                      isToday ? "bg-emerald-50/70 dark:bg-emerald-500/5" : "bg-white dark:bg-slate-900/40"
                    }`}
                    onClick={() => {
                      const slotDate = new Date(day);
                      slotDate.setHours(slotHour, 0, 0, 0);
                      onAddActivity(slotDate, "session");
                    }}
                    onDrop={(e) => handleDrop(e, day)}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {daySession.map((session, index) => {
                      const deadline = isDeadline(session);
                      const rawTime = session.startTime || session.Start || session.start_time || session.time;
                      const parsedTime = parseTime(rawTime);
                      const startMinute = deadline ? 0 : parsedTime.minute;
                      const durationMinutes = getSessionDurationMinutes(session);

                      const topPx = (startMinute / 60) * 64;
                      const heightPx = Math.max(32, (durationMinutes / 60) * 64);
                      const numSessions = daySession.length;
                      const widthPct = (100 - 4) / numSessions;
                      const leftPct = (index * 100) / numSessions;

                      const styleProps = {
                        top: `${topPx}px`,
                        height: `${heightPx}px`,
                        left: `calc(${leftPct}% + 2px)`,
                        width: `calc(${widthPct}% - 2px)`,
                      };

                      return renderSessionItem(session, true, styleProps);
                    })}
                    {daySession.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Plus className="h-4 w-4 text-slate-300 dark:text-slate-600" />
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

  const selectedSessionTitle = selectedSession?.purpose || selectedSession?.Topic || selectedSession?.title || "Course";
  const selectedSessionSubject = selectedSession?.Subject || selectedSession?.subject || "-";
  const selectedSessionDateStr = selectedSession
    ? getLocalDateKey(selectedSession.date || selectedSession.Date || selectedSession.block_date || selectedSession.due_date)
    : "";
  const selectedSessionParsedTime = selectedSession
    ? parseTime(selectedSession.startTime || selectedSession.Start || selectedSession.start_time || selectedSession.time)
    : { hour: 9, minute: 0 };
  const selectedSessionTimeLabel = formatTimeDisplay(selectedSessionParsedTime);
  const selectedSessionDurMinutes = selectedSession ? getSessionDurationMinutes(selectedSession) : 60;

  return (
    <div className="relative mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/80 md:p-6">
      {renderMobileDayView()}
      {renderWeekView()}

      {/* Selected Session Detail Sheet */}
      <ResponsiveSheet
        isOpen={Boolean(selectedSession)}
        onClose={() => setSelectedSession?.(null)}
        title={
          isDeadline(selectedSession || {})
            ? "Deadline Details"
            : isTimeBlock(selectedSession || {})
            ? "Time Block Details"
            : "Activity Details"
        }
      >
        {selectedSession && (
          <div className="space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                {selectedSession.is_group_session && (
                  <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-[11px] font-semibold text-sky-800 dark:bg-sky-500/15 dark:text-sky-200">
                    <Users className="h-3 w-3" />
                    <span>{selectedSession.group_name}</span>
                  </div>
                )}
                <p className={`text-xs font-bold uppercase tracking-wider ${
                  isDeadline(selectedSession)
                    ? "text-rose-600 dark:text-rose-300"
                    : isTimeBlock(selectedSession)
                    ? "text-slate-600 dark:text-slate-400"
                    : selectedSession.is_group_session
                    ? "text-sky-600 dark:text-sky-300"
                    : "text-emerald-600 dark:text-emerald-300"
                }`}>
                  {isDeadline(selectedSession)
                    ? "Deadline"
                    : isTimeBlock(selectedSession)
                    ? "Protected Time Block"
                    : selectedSession.is_group_session
                    ? "Group Study Session"
                    : selectedSession.type || "Course"}
                </p>
                <h3 className="mt-1 text-lg font-bold">{selectedSessionTitle}</h3>
              </div>
              {onEditActivity && !selectedSession.is_group_session && (
                <button
                  type="button"
                  onClick={() => {
                    const sessionToEdit = selectedSession;
                    setSelectedSession?.(null);
                    onEditActivity(sessionToEdit);
                  }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-slate-300 dark:hover:bg-slate-800 motion-reduce:transition-none"
                  aria-label="Edit activity"
                >
                  <Edit2 size={16} />
                </button>
              )}
            </div>

            <dl className="space-y-2 text-sm border-t border-slate-200 pt-3 dark:border-slate-800">
              {!isTimeBlock(selectedSession) && (
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Subject</dt><dd className="font-semibold text-right">{selectedSessionSubject}</dd></div>
              )}
              {selectedSession.is_group_session && (
                <div className="flex justify-between gap-3"><dt className="text-slate-500">RSVP Status</dt><dd className="font-semibold capitalize text-right text-cyan-600 dark:text-cyan-400">{selectedSession.user_rsvp || "Not responded"} ({selectedSession.going_count} going)</dd></div>
              )}
              {!isTimeBlock(selectedSession) && (
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Status</dt><dd className="font-semibold text-right capitalize">{selectedSession.status || "Scheduled"}</dd></div>
              )}
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Date</dt><dd className="font-semibold text-right">{selectedSessionDateStr}</dd></div>
              {!isDeadline(selectedSession) && <div className="flex justify-between gap-3"><dt className="text-slate-500">Time</dt><dd className="font-semibold text-right">{selectedSessionTimeLabel}</dd></div>}
              {!isDeadline(selectedSession) && <div className="flex justify-between gap-3"><dt className="text-slate-500">Duration</dt><dd className="font-semibold text-right">{selectedSessionDurMinutes} minutes</dd></div>}
              {selectedSession.isRecurring && <div className="flex justify-between gap-3"><dt className="text-slate-500">Repeats</dt><dd className="font-semibold capitalize text-right">Recurring series</dd></div>}
              {selectedSession.notes && <div className="border-t border-slate-100 pt-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400"><dt className="font-bold mb-1">Notes</dt><dd>{selectedSession.notes}</dd></div>}
            </dl>

            <div className="flex gap-2 pt-2">
              {onMarkStatus && !selectedSession.is_group_session && !isDeadline(selectedSession) && !isTimeBlock(selectedSession) && (
                <button
                  type="button"
                  onClick={() => {
                    const newStatus = selectedSession.status === "completed" ? "scheduled" : "completed";
                    onMarkStatus(selectedSession.id, newStatus);
                    setSelectedSession?.(null);
                  }}
                  className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 motion-reduce:transition-none ${
                    selectedSession.status === "completed"
                      ? "bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  <Check className="h-4 w-4" />
                  {selectedSession.status === "completed" ? "Mark incomplete" : "Mark complete"}
                </button>
              )}

              {selectedSession.is_group_session ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSession?.(null);
                    navigate(`/community?tab=groups&groupId=${selectedSession.group_id}`);
                  }}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-emerald-500 dark:hover:bg-emerald-400 motion-reduce:transition-none"
                >
                  <Users className="h-4 w-4" />
                  View Group
                </button>
              ) : (
                !isDeadline(selectedSession) && !isTimeBlock(selectedSession) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSession?.(null);
                      navigate(`/courses/${selectedSession.id}`);
                    }}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-emerald-500 dark:hover:bg-emerald-400 motion-reduce:transition-none"
                  >
                    {selectedSession.status === "paused" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                    {selectedSession.status === "paused" ? "Resume" : "Start"}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </ResponsiveSheet>
    </div>
  );
};

export default Calendar;
