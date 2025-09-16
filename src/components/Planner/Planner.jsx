import React, { useState } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Target,
  Bell,
  ExternalLink,
} from "lucide-react";
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
  const [sessions, setSessions] = useState([
    {
      id: 1,
      title: 'Calculus II Review',
      subject: 'Mathematics',
      type: 'study',
      date: new Date(2025, 8, 15), // September 15, 2025
      startTime: '09:00',
      endTime: '10:30',
      duration: 90,
      recurring: 'weekly',
      color: 'bg-blue-500'
    },
    {
      id: 2,
      title: 'Chemistry Lab Report',
      subject: 'Chemistry',
      type: 'assignment',
      date: new Date(2025, 8, 16),
      startTime: '14:00',
      endTime: '16:00',
      duration: 120,
      deadline: new Date(2025, 8, 18),
      color: 'bg-green-500'
    },
    {
      id: 3,
      title: 'Midterm Exam - Physics',
      subject: 'Physics',
      type: 'exam',
      date: new Date(2025, 8, 20),
      startTime: '10:00',
      endTime: '12:00',
      duration: 120,
      color: 'bg-red-500'
    }
  ]);

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

      {/* Calendar */}
      <Calendar
        currentDate={currentDate}
        viewMode={viewMode}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        sessions={sessions}
        handleDragStart={handleDragStart}
        handleDrop={handleDrop}
      />

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