import React, { useState, useEffect } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Target,
  Bell,
  ExternalLink,
} from "lucide-react";
import supabase from "../../lib/supabase";
import Calendar from './Calendar';
import SessionScheduler from './SessionScheduler';
import DeadlineManager from './DeadlineManager';
import RecurringSetup from './RecurringSetup';
import TimeBlocking from './TimeBlocking';
import ExternalCalendarSync from './ExternalCalendarSync';

const PlannerPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [draggedSession, setDraggedSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  const [newSession, setNewSession] = useState({
    title: '',
    subject: '',
    type: 'study',
    date: selectedDate,
    startTime: '09:00',
    duration: 60,
    recurring: 'none',
    reminder: 15
  });

  const subjects = ['Mathematics', 'Chemistry', 'Physics', 'Biology', 'English', 'History', 'Computer Science'];
  const sessionTypes = [
    { value: 'study', label: 'Study Session', color: 'bg-blue-500' },
    { value: 'assignment', label: 'Assignment', color: 'bg-green-500' },
    { value: 'exam', label: 'Exam', color: 'bg-red-500' },
    { value: 'review', label: 'Review', color: 'bg-purple-500' }
  ];

  // Fetch study sessions from Supabase
  useEffect(() => {
    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from("Study")
        .select('id,Subject,Topic,Status,Date,"Start",Duration');
      if (error) {
        console.error("Error fetching study sessions:", error);
      } else {
        const mappedSessions = data.map(session => {
          let color = 'bg-blue-500';
          switch (session.Status) {
            case 'Very Important':
              color = 'bg-red-500';
              break;
            case 'Not so Important':
              color = 'bg-green-500';
              break;
            case 'Medium':
              color = 'bg-orange-500';
              break;
            default:
              color = 'bg-blue-500';
          }
          return {
            id: session.id,
            title: session.Topic,
            subject: session.Subject,
            type: 'study',
            date: new Date(session.Date),
            startTime: session.Start,
            endTime: calculateEndTime(session.Start, session.Duration),
            duration: session.Duration,
            recurring: 'none',
            color: color
          };
        });
        setSessions(mappedSessions);
      }
    };
    fetchSessions();
  }, []);

  // Navigation functions
  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const formatDateHeader = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };



  // Drag and drop handlers
  const handleDragStart = (e, session) => {
    setDraggedSession(session);
  };

  const handleDrop = (e, targetDate) => {
    e.preventDefault();
    if (draggedSession) {
      setSessions(prev => prev.map(session => 
        session.id === draggedSession.id 
          ? { ...session, date: new Date(targetDate) }
          : session
      ));
      setDraggedSession(null);
    }
  };

  const handleCreateSession = () => {
    const session = {
      id: sessions.length + 1,
      ...newSession,
      date: selectedDate,
      endTime: calculateEndTime(newSession.startTime, newSession.duration),
      color: sessionTypes.find(type => type.value === newSession.type)?.color || 'bg-blue-500'
    };
    setSessions(prev => [...prev, session]);
    setShowCreateModal(false);
    setNewSession({
      title: '',
      subject: '',
      type: 'study',
      date: selectedDate,
      startTime: '09:00',
      duration: 60,
      recurring: 'none',
      reminder: 15
    });
  };

  const calculateEndTime = (startTime, duration) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(hours, minutes + duration);
    return endDate.toTimeString().slice(0, 5);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 px-10 lg:px-0">
            Study Planner
          </h1>
          <p className="text-gray-600 mt-1">
            Schedule and manage your study sessions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Session</span>
        </button>
      </div>

      {/* Controls */}
      <div className="lg:flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4 mb-10">
          
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900 min-w-48">
            {formatDateHeader()}
          </h2>
          <button
            onClick={() => navigateDate(1)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Today
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {["month", "week", "day"].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-sm rounded capitalize ${
                  viewMode === mode ? "bg-white shadow-sm" : "hover:bg-gray-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <button className="p-2 hover:bg-gray-100 rounded">
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar and Details */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <Calendar
            currentDate={currentDate}
            viewMode={viewMode}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            sessions={sessions}
            handleDragStart={handleDragStart}
            handleDrop={handleDrop}
            setSelectedSession={setSelectedSession}
          />
        </div>
        {selectedSession && (
          <div className="w-full h-fit lg:w-80 bg-white rounded-lg border border-gray-200 p-6 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Session Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <p className="text-gray-900">{selectedSession.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <p className="text-gray-900">{selectedSession.subject}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <p className="text-gray-900">{selectedSession.date.toLocaleDateString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Time</label>
                <p className="text-gray-900">{selectedSession.startTime} - {selectedSession.endTime}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration</label>
                <p className="text-gray-900">{selectedSession.duration} minutes</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <p className="text-gray-900">{selectedSession.type}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedSession(null)}
              className="mt-4 w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <RecurringSetup sessions={sessions} setSessions={setSessions} />
        <DeadlineManager sessions={sessions} />
        <TimeBlocking />
      </div>
      <ExternalCalendarSync />

      {/* Session Scheduler Modal */}
      <SessionScheduler
        showModal={showCreateModal}
        setShowModal={setShowCreateModal}
        newSession={newSession}
        setNewSession={setNewSession}
        selectedDate={selectedDate}
        subjects={subjects}
        sessionTypes={sessionTypes}
        handleCreateSession={handleCreateSession}
      />
    </div>
  );
};

export default PlannerPage;