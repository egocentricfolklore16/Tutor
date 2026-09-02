import { createElement } from "react";
import {
  BookOpen,
  X,
  FileText,
  Clock,
  Library,
  HelpCircle,
} from "lucide-react";

const Sidepane = ({ isOpen, onToggle, width, user, activeTool, onToolSelect, theme }) => {

  const UserCard = ({ user }) => (
    <div className="flex items-center justify-center py-6">
    <div className={`rounded-lg bg-white p-4 text-center ${isOpen ? "w-48 shadow" : "w-12"}`}>
        <div className="w-16 h-16 rounded-full bg-gray-200 mx-auto mb-3 flex items-center justify-center">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt="avatar"
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <span className="text-xl font-bold text-gray-600">
              {(user?.name || "?").charAt(0)}
            </span>
          )}
        </div>
        <div className="font-semibold text-gray-900">
          {user?.name || "Guest"}
        </div>
        <div className="text-xs text-gray-500">{user?.email || ""}</div>
      </div>
    </div>
  );

  const NavItem = ({ Icon: NavIcon, label, page }) => (
    <button
      onClick={() => {
        onToolSelect(page);
      }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors text-left ${
        activeTool === page
          ? `${theme?.accentBg || "bg-red-50"} ${theme?.accentText || "text-red-700"}`
          : "text-gray-600 hover:bg-gray-50"
      }`}
    >
      {createElement(NavIcon, { className: "w-5 h-5" })}
      {isOpen && <span className="font-medium">{label}</span>}
    </button>
  );

  return (
    <>
      {/* {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )} */}

      <div
        className="fixed inset-y-0 left-0 z-[1005] flex flex-col overflow-hidden border-r border-gray-200 bg-white transition-all duration-300"
        style={{ width: isOpen ? `${width}px` : "64px", left: "var(--app-sidebar-width, 0px)" }}
      >
        {isOpen && <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div className="flex items-center gap-2">
            <BookOpen className={`w-6 h-6 ${theme?.accent || "text-red-600"}`} />
            {isOpen && <span className="text-sm font-bold text-gray-900">StudyBuddy</span>}
          </div>
          <button
            onClick={onToggle}
            title={isOpen ? "Collapse study tools" : "Expand study tools"}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          >
            {isOpen ? <X className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
          </button>
        </div>}

        {/* center area: show user card */}
        {isOpen && user && <UserCard user={user} />}

        <nav className={`flex-1 p-2 text-[14px] ${isOpen ? "" : "pt-5"}`}>
          <NavItem Icon={FileText} label="Notes" page="notes" />
          <NavItem Icon={Clock} label="Pomodoro Timer" page="pomodoro" />
          <NavItem Icon={Library} label="Flashcards" page="flashcards" />
          <NavItem Icon={HelpCircle} label="Quizicle" page="quizzicle" />
          <NavItem Icon={BookOpen} label="Resources" page="resources" />
        </nav>
      </div>
    </>
  );
};

export default Sidepane;
