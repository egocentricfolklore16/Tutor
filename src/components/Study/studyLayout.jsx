// ==================== LAYOUT COMPONENT ====================
import { Menu, Bot, Bell, Import } from 'lucide-react'

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
            className={`fixed bottom-[20px] z-50 right-[20px] scale-[1.5] p-2 hover:bg-green-100 rounded-full text-green-600 transition-colors ${
              isAiPanelOpen
                ? "bg-indigo-50 text-green-600 mb-12 "
                : "text-green-600"
            }`}
          >
            {isAiPanelOpen ? (
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="0"
                viewBox="0 0 20 20"
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                  clipRule="evenodd"
                ></path>
              </svg>
            ) : (
              <svg
                stroke="currentColor"
                fill="none"
                strokeWidth="0"
                viewBox="0 0 24 24"
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                ></path>
              </svg>
            )}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Bell className="w-5 h-5 text-gray-600" />
          </button>
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
