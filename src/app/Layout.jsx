import React, { useState } from "react";
import { Outlet } from "react-router";
import Sidebar from "../components/Layout/Sidebar";

function Layout({ session }) {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  // Extract user from session
  const user = session?.user || null;

  return (
    <div className="mainapp">
      <Sidebar isOpen={!isOpen} toggleSidebar={toggleSidebar} user={user} />

      <div
        className={`pagecontent ${
          !isOpen ? "ml-0 md:ml-60" : "ml-0 md:ml-16"
        } transition-all duration-200 ease-in-out`}
        style={{
          "--app-sidebar-width": isOpen ? "4rem" : "15rem",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;
