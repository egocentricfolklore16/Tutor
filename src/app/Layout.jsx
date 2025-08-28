import React from 'react'
import { Outlet } from 'react-router'
import Sidebar from '../components/Layout/Sidebar'
function Layout() {
  return (
    <div className="mainapp">
      <div className="sidepane">
        <Sidebar />
      </div>
      <div className="pagecontent">
        <Outlet />
      </div>
    </div>
  );
}

export default Layout