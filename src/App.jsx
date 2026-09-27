import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Community from "./components/Community/community.jsx";
import SignupPage from "./components/Auth/SignupForm.jsx";
import AuthLayout from "./components/Auth/AuthLayout.jsx";
import Layout from "./app/Layout.jsx";
import Overview from "./components/Dashboard/Overview.jsx";
import Study from "./components/Study/StudyHome.jsx";
import LoginPage from "./components/Auth/LoginForm.jsx";
import NotFound from "./components/common/NotFound.jsx";
import supabase from "./lib/supabase.js";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";
import PlannerPage from "./components/Planner/Planner.jsx";
import StudyEnvironment from "./components/Study/studyEnviron/StudyEnvironment.jsx";
import Library from "./components/Library/Library.jsx";
import Progress from "./components/Progress/Progress.jsx";
import NoteDetail from "./components/Study/NoteDetail.jsx";
import Onboarding from "./components/Auth/Onboarding.jsx";
import AuthCallback from "./components/Auth/callback/page.jsx";
import Settings from "./components/Settings/Settings.jsx";
import FAQ from "./components/FAQ/FAQ.jsx";
import StudyHistoryDetail from "./components/Study/StudyHistoryDetail.jsx";

// Routing will be handled inside the BrowserRouter below

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let mounted = true;

    const handleOnboardingCompleted = (event) => {
      if (event.detail?.userId && session?.user?.id === event.detail.userId) {
        setNeedsOnboarding(false);
      }
    };

    window.addEventListener("hyper-tutor-onboarding-completed", handleOnboardingCompleted);

    const getCompletedLocally = (userId) => {
      try {
        return sessionStorage.getItem(`hyper-tutor-onboarding-complete:${userId}`) === "true";
      } catch (e) {
        console.error("Error reading onboarding completion from sessionStorage:", e);
        return false;
      }
    };

    const watchdogTimer = setTimeout(() => {
      if (mounted) {
        console.warn("Bootstrap auth or onboarding check timed out. Forcing loading states to false.");
        setLoading(false);
        setOnboardingLoading(false);
      }
    }, 7000);

    const bootstrapAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting Supabase session during bootstrap:", error);
          const errMsg = error.message || "";
          const errCode = error.code || "";
          if (
            errMsg.toLowerCase().includes("refresh token") ||
            errCode === "refresh_token_not_found" ||
            errCode === "session_not_found" ||
            errCode === "invalid_grant"
          ) {
            await supabase.auth.signOut({ scope: "local" });
            if (!mounted) return;
            setSession(null);
            setNeedsOnboarding(false);
            setLoading(false);
            return;
          }
        }

        const currentSession = data?.session || null;
        if (!mounted) return;
        setSession(currentSession);

        if (currentSession?.user) {
          setOnboardingLoading(true);
          try {
            const completedLocally = getCompletedLocally(currentSession.user.id);
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("onboarding_completed")
              .eq("user_id", currentSession.user.id)
              .maybeSingle();

            if (profileError) {
              console.error("Error fetching user profile during bootstrap onboarding check:", profileError);
            }

            if (mounted) {
              setNeedsOnboarding(!completedLocally && (Boolean(profileError) || !profile?.onboarding_completed));
            }
          } catch (profileErr) {
            console.error("Unexpected error during profile onboarding check:", profileErr);
          } finally {
            if (mounted) {
              setOnboardingLoading(false);
            }
          }
        }
      } catch (err) {
        console.error("Unexpected error in bootstrapAuth:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
        clearTimeout(watchdogTimer);
      }
    };

    bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        setSession(null);
        setNeedsOnboarding(false);
        const publicPaths = ["/login", "/signup", "/auth/callback", "/"];
        const currentPath = window.location.pathname;
        if (!publicPaths.includes(currentPath)) {
          window.location.href = "/login";
        }
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setSession(nextSession);
        if (nextSession?.user) {
          try {
            const completedLocally = getCompletedLocally(nextSession.user.id);
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("onboarding_completed")
              .eq("user_id", nextSession.user.id)
              .maybeSingle();

            if (profileError) {
              console.error("Error fetching user profile on auth state change:", profileError);
            }

            if (mounted) {
              setNeedsOnboarding(!completedLocally && (Boolean(profileError) || !profile?.onboarding_completed));
            }
          } catch (profileErr) {
            console.error("Unexpected error checking profile on auth state change:", profileErr);
          }
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(watchdogTimer);
      subscription.unsubscribe();
      window.removeEventListener("hyper-tutor-onboarding-completed", handleOnboardingCompleted);
    };
  }, []);

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
              <Route path="Study/history/:historyId" element={<StudyHistoryDetail />} />
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
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
