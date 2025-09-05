import { Outlet } from "react-router";
import SidePane from "./side/Sidepane";
import React, { useState } from 'react'
import { useSidebar } from '../../contexts/SidebarContext'

function Layout() {
  const [isSidepaneOpen, setIsSidepaneOpen] = useState(true);
  const { isOpen: isSidebarOpen, toggleSidebar } = useSidebar();

  const toggleSidepane = () => {
    const newState = !isSidepaneOpen;
    setIsSidepaneOpen(newState);
    if (newState && isSidebarOpen) {
      toggleSidebar();
    }
  };

  return (
    <div className="minapp">
        <SidePane isOpen={isSidepaneOpen} toggle={toggleSidepane} />
        <div className="relative">
          {!isSidepaneOpen && (
            <button
              onClick={toggleSidepane}
              className="absolute top-4 left-4 z-10 bg-green-500 hover:bg-green-600 text-white p-2 rounded-full shadow-lg transition-all duration-300"
            >
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="0"
                viewBox="0 0 16 16"
                height="1.5em"
                width="1.5em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <Outlet />
        </div>
    </div>
  )
}

export default Layout