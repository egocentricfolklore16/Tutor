import React, { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import Sidebar from "../components/Layout/Sidebar";
import StudyCompanion from "../components/Study/studyEnviron/StudyCompanion";
import DashboardHeader from "../components/Dashboard/DashboardHeader";
import { ProfileProvider, useProfile } from "./ProfileContext";

function GlobalStudyCompanion() {
  const { profile } = useProfile();
  return <StudyCompanion topic={profile?.current_topic || "your studies"} />;
}

function Layout({ session, needsOnboarding }) {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();
  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  const pageTitle = (() => {
    if (location.pathname.startsWith("/Study")) return "Study";
    if (location.pathname.startsWith("/Planner")) return "Planner";
    if (location.pathname.startsWith("/Progress")) return "Progress";
    if (location.pathname.startsWith("/Library")) return "Library";
    if (location.pathname.startsWith("/Community")) return "Community";
    if (location.pathname.startsWith("/FAQ")) return "FAQ";
    if (location.pathname.startsWith("/Settings")) return "Settings";
    return "Dashboard";
  })();

  // Extract user from session
  const user = session?.user || null;

  if (needsOnboarding) return <Navigate to="/onboarding" replace />;

  return (
    <ProfileProvider user={user}>
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
          <DashboardHeader title={pageTitle} />
          <Outlet />
          {!location.pathname.startsWith("/Dashboard") && location.pathname !== "/" && (
            <section className="mx-auto mt-6 max-w-6xl px-5 pb-8 md:px-10 lg:px-16">
              <GlobalStudyCompanion />
            </section>
          )}
        </div>
      </div>
    </ProfileProvider>
  );
}

export default Layout;
