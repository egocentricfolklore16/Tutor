import React from 'react';
import { Plus } from 'lucide-react';

const Calendar = ({
  currentDate,
  selectedDate,
  setSelectedDate,
  sessions,
  handleDrop,
  setSelectedSession,
  selectedSession,
  onAddActivity,
}) => {
  const isDeadline = (session) => session.activityType === "deadline" || session.type === "deadline";

  const renderSessionItem = (session, compact = false) => {
    const deadline = isDeadline(session);
    const isOpen = selectedSession?.id === session.id;

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
          <span className="block truncate font-semibold">{deadline ? "Deadline" : session.title}</span>
          {!compact && deadline && <span className="block truncate">{session.title}</span>}
        </button>
        {isOpen && (
          <div className="absolute left-full top-0 z-40 ml-2 w-64 rounded-xl border border-slate-200 bg-white p-4 text-left text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${deadline ? "text-red-600" : "text-blue-600"}`}>{deadline ? "Deadline" : "Study session"}</p>
                <h3 className="mt-1 text-sm font-bold">{session.title}</h3>
              </div>
              <button type="button" onClick={() => setSelectedSession?.(null)} title="Close details" className="text-lg leading-none text-slate-400 hover:text-slate-900">&times;</button>
            </div>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Subject</dt><dd className="font-semibold text-right">{session.subject || "-"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Date</dt><dd className="font-semibold text-right">{session.date.toLocaleDateString()}</dd></div>
              {!deadline && <div className="flex justify-between gap-3"><dt className="text-slate-500">Time</dt><dd className="font-semibold text-right">{session.startTime} - {session.endTime}</dd></div>}
              {!deadline && <div className="flex justify-between gap-3"><dt className="text-slate-500">Duration</dt><dd className="font-semibold text-right">{Number(session.duration || 0).toFixed(2).replace(/\.00$/, "")} hours</dd></div>}
              {session.recurring && session.recurring !== "none" && <div className="flex justify-between gap-3"><dt className="text-slate-500">Repeats</dt><dd className="font-semibold capitalize text-right">{session.recurring}</dd></div>}
            </dl>
          </div>
        )}
      </div>
    );
  };

  const renderCalendarGrid = () => renderWeekView();

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }

    return (
      <div className="grid min-w-[1180px] grid-cols-8 gap-2 h-96">
        <div className="text-sm font-semibold text-gray-600">Time</div>
        {weekDays.map((day) => (
          <div
            key={day.toDateString()}
            className="text-sm font-semibold text-gray-600 text-center"
          >
            <div>{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
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
        ))}

        {[...Array(12)].map((_, hour) => {
          const time = `${(hour + 8).toString().padStart(2, "0")}:00`;
          return (
            <React.Fragment key={time}>
              <div className="text-xs text-gray-500 py-2">{time}</div>
              {weekDays.map((day) => {
                const daySession = sessions.filter(
                  (session) =>
                    session.date.toDateString() === day.toDateString() &&
                    (isDeadline(session)
                      ? hour === 0
                      : parseInt(session.startTime.split(":")[0]) === hour + 8)
                );
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
      {renderCalendarGrid()}
      <img src="/logo3.png" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 h-10 w-10 object-contain opacity-20" />
    </div>
  );
};

export default Calendar;
