// ==================== LAYOUT COMPONENT ====================
import { Menu, Bot, Bell, Import } from 'lucide-react'
import NoteEditor from './studyEnviron/NoteEditor';
import AITutorChat from './studyEnviron/AITutorChat';
import Flashcards from './studyEnviron/Flashcards';
import SessionControls from './studyEnviron/SessionControls';
import StudySession from './studyEnviron/StudySession';
import PomodoroTimer from './studyEnviron/PomodoroTimer';
import PracticeQuestions from './studyEnviron/PracticeQuestions';
import ResourceAttachments from './studyEnviron/ResourceAttachments';
const StudyLayout = ({
  children,
  onToggleSidebar,
  onToggleAiPanel,
  isAiPanelOpen,
}) => {
  const Header = () => (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={onToggleAiPanel}
            className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${
              isAiPanelOpen ? "bg-indigo-50 text-indigo-600" : "text-gray-600"
            }`}
          >
            <Bot className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Bell className="w-5 h-5 text-gray-600" />
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400"></div>
        </div>
      </div>
    </header>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      {children}
    </div>
  );
};

export default StudyLayout;
