import React from "react";
import PomodoroTimer from "./PomodoroTimer";
import SessionControls from "./SessionControls";
import PracticeQuestions from "./PracticeQuestions";
import ResourceAttachments from "./ResourceAttachments";
import NoteEditor from "./NoteEditor";

const StudySession = ({
  timeLeft,
  isStudying,
  onToggleStudying,
  activeTab,
  onTabChange,
  sessionStats,
}) => {
  const TabButton = ({ label, active, onClick }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
        active
          ? "text-indigo-600 border-b-2 border-indigo-600"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );

  const StatCard = ({ title, value }) => (
    <div className="border border-gray-200 rounded-lg p-6">
      <div className="text-sm text-gray-500 mb-2">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6">
        Calculus Study Session
      </h1>

      <div className="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
        <TabButton
          label="Timer"
          active={activeTab === "timer"}
          onClick={() => onTabChange("timer")}
        />
        <TabButton
          label="Notes"
          active={activeTab === "notes"}
          onClick={() => onTabChange("notes")}
        />
        <TabButton
          label="Resources"
          active={activeTab === "resources"}
          onClick={() => onTabChange("resources")}
        />
      </div>

      {activeTab === "timer" && (
        <>
          <PomodoroTimer timeLeft={timeLeft} />
          <SessionControls
            isStudying={isStudying}
            onToggleStudying={onToggleStudying}
          />
          <PracticeQuestions />
          <ResourceAttachments />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Time Studied" value={sessionStats.timeStudied} />
            <StatCard
              title="Questions Answered"
              value={sessionStats.questionsAnswered}
            />
            <StatCard title="Accuracy" value={sessionStats.accuracy} />
          </div>
        </>
      )}

      {activeTab === "notes" && <NoteEditor />}
      {activeTab === "resources" && <ResourceAttachments />}
    </div>
  );
};

export default StudySession;
