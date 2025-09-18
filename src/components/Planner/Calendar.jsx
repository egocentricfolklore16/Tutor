import React from 'react';

const Calendar = ({
  currentDate,
  viewMode,
  selectedDate,
  setSelectedDate,
  sessions,
  handleDrop,
  setSelectedSession
}) => {
  const renderCalendarGrid = () => {
    if (viewMode === 'month') {
      return renderMonthView();
    } else if (viewMode === 'week') {
      return renderWeekView();
    } else {
      return renderDayView();
    }
  };

  const renderMonthView = () => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-sm font-semibold text-gray-600 text-center">
            {day}
          </div>
        ))}
        {days.map((day, index) => {
          const daySession = sessions.filter(session =>
            session.date.toDateString() === day.toDateString()
          );
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = day.toDateString() === new Date().toDateString();
          const isSelected = day.toDateString() === selectedDate.toDateString();

          return (
            <div
              key={index}
              className={`min-h-24 p-1 border rounded cursor-pointer transition-colors ${
                isCurrentMonth ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 text-gray-400'
              } ${isToday ? 'ring-2 ring-blue-500' : ''} ${isSelected ? 'bg-blue-100' : ''}`}
              onClick={() => setSelectedDate(new Date(day))}
              onDrop={(e) => handleDrop(e, day)}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>
                {day.getDate()}
              </div>
              <div className="space-y-1 mt-1">
                {daySession.slice(0, 2).map(session => (
                  <div
                    key={session.id}
                    className={`text-xs p-1 rounded text-white cursor-pointer ${session.color}`}
                    onClick={() => setSelectedSession && setSelectedSession(session)}
                  >
                    {session.title.substring(0, 12)}...
                  </div>
                ))}
                {daySession.length > 2 && (
                  <div className="text-xs text-gray-500">+{daySession.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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
      <div className="grid grid-cols-8 gap-2 h-96 overflow-x-auto">
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
                    parseInt(session.startTime.split(":")[0]) === hour + 8
                );
                return (
                  <div
                    key={`${day.toDateString()}-${time}`}
                    className="border border-gray-200 p-1 min-h-12"
                    onDrop={(e) => handleDrop(e, day)}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {daySession.map((session) => (
                      <div
                        key={session.id}
                        className={`text-xs p-1 rounded text-white mb-1 cursor-pointer ${session.color}`}
                        onClick={() => setSelectedSession && setSelectedSession(session)}
                      >
                        {session.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const daySession = sessions.filter(session =>
      session.date.toDateString() === currentDate.toDateString()
    );

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-lg mb-3">Schedule</h3>
            <div className="space-y-2">
              {[...Array(14)].map((_, hour) => {
                const time = `${(hour + 6).toString().padStart(2, '0')}:00`;
                const hourSessions = daySession.filter(session =>
                  parseInt(session.startTime.split(':')[0]) === hour + 6
                );
                return (
                  <div key={time} className="flex items-start space-x-3 min-h-12">
                    <div className="text-sm text-gray-500 w-16">{time}</div>
                    <div className="flex-1 space-y-1 overflow-x-hidden">
                      {hourSessions.map(session => (
                        <div
                          key={session.id}
                          className={`p-2 rounded text-white cursor-pointer ${session.color}`}
                          onClick={() => setSelectedSession && setSelectedSession(session)}
                        >
                          <div className="font-medium">{session.title}</div>
                          <div className="text-xs">{session.startTime} - {session.endTime}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-3">Day Overview</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Total Study Time:</span>
                  <span className="font-semibold">
                    {daySession.reduce((acc, session) => acc + (session.duration || 60), 0)} minutes
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Sessions:</span>
                  <span className="font-semibold">{daySession.length}</span>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Subjects:</div>
                  {[...new Set(daySession.map(s => s.subject))].map(subject => (
                    <div key={subject} className="text-xs bg-white px-2 py-1 rounded">
                      {subject}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
      {renderCalendarGrid()}
    </div>
  );
};

export default Calendar;
