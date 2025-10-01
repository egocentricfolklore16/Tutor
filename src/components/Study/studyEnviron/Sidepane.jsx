import React from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  X,
  FileText,
  Clock,
  Library,
  HelpCircle,
} from "lucide-react";

const Sidepane = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const NavItem = ({ Icon, label, page }) => (
    <button
      onClick={() => {
        navigate(page);
        if (window.innerWidth < 1024) {
          onClose();
        }
      }}
      className="w-full flex items-center gap-3 px-2 py-1 rounded-lg mb-1 transition-colors text-gray-600 hover:bg-gray-50"
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
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
        className={` lg:static inset-y-0 left-0 z-50 w-55 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <span className="text-sm font-bold text-gray-900">StudyBuddy</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <nav className="flex-1 p-2 text-[14px]">
          <NavItem
            Icon={FileText}
            label="Notes"
            page="notes"
          />
          <NavItem
            Icon={Clock}
            label="Pomodoro Timer"
            page="pomodoro"
          />
          <NavItem
            Icon={Library}
            label="Flashcards"
            page="flashcards"
          />
          <NavItem
            Icon={HelpCircle}
            label="Quizzicle"
            page="quizzicle"
          />
          <NavItem
            Icon={BookOpen}
            label="Resources"
            page="resources"
          />
        </nav>
      </div>
    </>
  );
};

export default Sidepane;
