import React, { useState } from "react";
import { Outlet } from "react-router";
import Sidebar from "../components/Layout/Sidebar";

function Layout() {

  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="mainapp">
      <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} />

      <div
        className={`pagecontent ${
          isOpen ? "ml-16 md:ml-60" : "ml-16"
        } transition-all duration-200 ease-in-out`}
      >
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;
