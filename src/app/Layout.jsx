import React, { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Layout/Sidebar";
import StudyCompanion from "../components/Study/studyEnviron/StudyCompanion";
import DashboardHeader from "../components/Dashboard/DashboardHeader";
import GlobalAITutorFab from "../components/common/GlobalAITutorFab";
import InstallPrompt from "../components/InstallPrompt";
import NotificationPromptCard from "../components/Notifications/NotificationPromptCard";
import BottomNavBar from "../components/common/BottomNavBar";
import { ProfileProvider, useProfile } from "./ProfileContext";
import { AITutorProvider } from "./AITutorContext";

function GlobalStudyCompanion() {
  const { profile } = useProfile();
  return <StudyCompanion topic={profile?.current_topic || "your studies"} />;
}

function Layout({ session, needsOnboarding }) {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();
  const isStudyEnvironment = location.pathname.startsWith("/Study/");
  const isSidebarExpanded = !isStudyEnvironment && !isOpen;
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

  // Check standalone / installed status
  const isStandalone =
    (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) ||
    (typeof navigator !== "undefined" && navigator.standalone === true);

  if (needsOnboarding) return <Navigate to="/onboarding" replace />;

  return (
    <ProfileProvider user={user}>
      <AITutorProvider session={session}>
        <div className="mainapp">
        <Sidebar isOpen={isSidebarExpanded} toggleSidebar={toggleSidebar} user={user} />

        <div
          className={`pagecontent ${
            isSidebarExpanded ? "ml-0 md:ml-60" : "ml-0 md:ml-16"
          } transition-all duration-200 ease-in-out`}
          style={{
            "--app-sidebar-width": isSidebarExpanded ? "15rem" : "4rem",
          }}
        >
          <DashboardHeader title={pageTitle} toggleSidebar={toggleSidebar} />

          {/* Post-install notification opt-in prompt for standalone launch / installed users */}
          {user?.id && isStandalone && !isStudyEnvironment && (
            <div className="px-5 pt-4 md:px-10">
              <NotificationPromptCard userId={user.id} />
            </div>
          )}

          <div key={location.pathname} className="page-enter">
            {location.pathname.startsWith("/Dashboard") || location.pathname === "/" ? (
              <Outlet />
            ) : isStudyEnvironment ? (
              <div className="min-w-0">
                <Outlet />
              </div>
            ) : (
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1">
                  <Outlet />
                </div>
                <section className="hidden w-full self-start px-5 pb-8 md:px-10 lg:block xl:sticky xl:top-24 xl:w-[320px] xl:shrink-0 xl:px-0">
                  <GlobalStudyCompanion />
                </section>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Tab Bar */}
        <BottomNavBar />

        {/* Global Persistent AI Tutor FAB & Portal Drawer */}
        <GlobalAITutorFab session={session} />

        {/* Install Hyper Tutor Prompt Card */}
        <InstallPrompt userId={user?.id} />
        </div>
      </AITutorProvider>
    </ProfileProvider>
  );
}

export default Layout;
