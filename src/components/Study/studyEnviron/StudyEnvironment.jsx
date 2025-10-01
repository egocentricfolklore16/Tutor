import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "../StudyLayout";
import Sidepane from "./Sidepane";
import PomodoroTimer from "./PomodoroTimer";
import SessionControls from "./SessionControls";
import PracticeQuestions from "./PracticeQuestions";
import ResourceAttachments from "./ResourceAttachments";
import AITutorChat from "./AITutorChat";
import NoteEditor from "./NoteEditor";
import Flashcards from "./Flashcards";
import StudySession from "./StudySession";
import PlaceholderPage from "./PlaceholderPage";

// ==================== MAIN APP COMPONENT ====================
export default function HyperTutor() {
  const [isStudying, setIsStudying] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 25,
    seconds: 0,
  });
  const [activeTab, setActiveTab] = useState("timer");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hi there! How can I help you with your calculus study session today?",
    },
  ]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [sessionStats] = useState({
    timeStudied: "1h 30m",
    questionsAnswered: 5,
    accuracy: "80%",
  });

  useEffect(() => {
    let interval = null;
    if (isStudying) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev.seconds > 0) {
            return { ...prev, seconds: prev.seconds - 1 };
          } else if (prev.minutes > 0) {
            return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
          } else if (prev.hours > 0) {
            return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
          }
          return prev;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStudying]);

  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      setMessages([
        ...messages,
        { sender: "user", text: currentMessage },
        {
          sender: "ai",
          text: "Of course! I can generate some practice problems for you. What difficulty level would you like?",
        },
      ]);
      setCurrentMessage("");
    }
  };

  const PomodoroPage = () => (
    <div className="flex-1 flex flex-col lg:flex-row">
      <StudySession
        timeLeft={timeLeft}
        isStudying={isStudying}
        onToggleStudying={() => setIsStudying(!isStudying)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sessionStats={sessionStats}
      />
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidepane
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <Layout
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onToggleAiPanel={() => setIsAiPanelOpen(!isAiPanelOpen)}
        isAiPanelOpen={isAiPanelOpen}
      >
        <Routes>
          <Route path="pomodoro" element={<PomodoroPage />} />
          <Route path="notes" element={<NoteEditor />} />
          <Route path="flashcards" element={<Flashcards />} />
          <Route path="quizzicle" element={<PlaceholderPage pageName="Quizzicle" />} />
          <Route path="resources" element={<ResourceAttachments />} />
          <Route path="*" element={<PlaceholderPage pageName="Not Found" />} />
        </Routes>
      </Layout>
      {isAiPanelOpen && (
        <AITutorChat
          isOpen={isAiPanelOpen}
          onClose={() => setIsAiPanelOpen(false)}
          messages={messages}
          currentMessage={currentMessage}
          onMessageChange={setCurrentMessage}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
}
