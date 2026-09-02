import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Community from "./components/Community/community.jsx";
import SignupPage from "./components/Auth/SignupForm.jsx";
import AuthLayout from "./components/Auth/AuthLayout.jsx";
import Layout from "./app/Layout.jsx";
import Overview from "./components/Dashboard/Overview.jsx";
import Study from "./components/Study/StudyHome.jsx";
import LoginPage from "./components/Auth/LoginForm.jsx";
import NotFound from "./components/common/NotFound.jsx";
import supabase from "./lib/supabase.js";
import ErrorBoundary from "./components/common/ErrorBoundary_temp.jsx";
import PlannerPage from "./components/Planner/Planner.jsx";
import StudyEnvironment from "./components/Study/studyEnviron/StudyEnvironment.jsx";
import Library from "./components/Library/Library.jsx";
import Progress from "./components/Progress/Progress.jsx";
import NoteDetail from "./components/Study/NoteDetail.jsx";
import Onboarding from "./components/Auth/Onboarding.jsx";
import AuthCallback from "./components/Auth/callback/page.jsx";
import Settings from "./components/Settings/Settings.jsx";
import FAQ from "./components/FAQ/FAQ.jsx";

// Routing will be handled inside the BrowserRouter below

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const handleOnboardingCompleted = (event) => {
      if (event.detail?.userId === session?.user?.id) {
        setNeedsOnboarding(false);
      }
    };

    window.addEventListener("hyper-tutor-onboarding-completed", handleOnboardingCompleted);

    const fetchSession = async () => {
      const currentSession = await supabase.auth.getSession();
      const nextSession = currentSession.data?.session || null;
      setSession(nextSession);
      if (nextSession?.user) {
        setOnboardingLoading(true);
        const completedLocally = sessionStorage.getItem(`hyper-tutor-onboarding-complete:${nextSession.user.id}`) === "true";
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("user_id", nextSession.user.id)
          .maybeSingle();
        setNeedsOnboarding(!completedLocally && (Boolean(error) || !profile?.onboarding_completed));
        setOnboardingLoading(false);
      }
      setLoading(false);
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setNeedsOnboarding(false);
        return;
      }
      const completedLocally = sessionStorage.getItem(`hyper-tutor-onboarding-complete:${session.user.id}`) === "true";
      supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data, error }) => setNeedsOnboarding(!completedLocally && (Boolean(error) || !data?.onboarding_completed)));
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("hyper-tutor-onboarding-completed", handleOnboardingCompleted);
    };
  }, [session?.user?.id]);

  if (loading || onboardingLoading) return null;

  return (
    <ErrorBoundary>
      <BrowserRouter>
        {session ? (
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/onboarding" element={<Onboarding session={session} />} />
            <Route path="/*" element={<Layout session={session} needsOnboarding={needsOnboarding} />}>
              <Route index element={<Overview />} />
              <Route path="Dashboard" element={<Overview />} />
              <Route path="Study" element={<Study />} />
              <Route path="Study/:Studyid" element={<StudyEnvironment />} />
              <Route path="Study/:Studyid/notes/:noteId" element={<NoteDetail />} />
              <Route path="signup" element={<SignupPage />} />
              <Route path="signin" element={<LoginPage />} />
              <Route path="Planner" element={<PlannerPage />} />
              <Route path="Progress" element={<Progress />} />
              <Route path="Library" element={<Library session={session} />} />
              <Route path="Community" element={<Community />} />
              <Route path="FAQ" element={<FAQ />} />
              <Route path="Settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        ) : (
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route
              path="/"
              element={
                <AuthLayout>
                  <SignupPage />
                </AuthLayout>
              }
            />
            <Route
              path="/signup"
              element={
                <AuthLayout>
                  <SignupPage />
                </AuthLayout>
              }
            />
            <Route
              path="/login"
              element={
                <AuthLayout>
                  <LoginPage />
                </AuthLayout>
              }
            />
          </Routes>
        )}
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
