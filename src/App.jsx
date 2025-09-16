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
import ErrorBoundary from "./components/Common/ErrorBoundary_temp.jsx";
import PlannerPage from "./components/Planner/Planner.jsx";
import StudyEnvironment from "./components/Study/studyEnviron/StudyEnvironment.jsx";

// Routing will be handled inside the BrowserRouter below

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchSession = async () => {
      const currentSession = await supabase.auth.getSession();
      setSession(currentSession.data?.session || null);
      setLoading(false);
    };
    fetchSession();
  }, []);

  if (loading) return null;

  return (
    <ErrorBoundary>
      <BrowserRouter>
        {session ? (
          <Routes>
            <Route path="/*" element={<Layout />}>
              <Route index element={<Overview />} />
              <Route path="Dashboard" element={<Overview />} />
              <Route path="Study" element={<Study />} />
              <Route path="Study/:Studyid" element={<StudyEnvironment />} />
              <Route path="signup" element={<SignupPage />} />
              <Route path="signin" element={<LoginPage />} />
              <Route path="Planner" element={<PlannerPage />} />
              <Route path="Progress" element={<div>Progress Page</div>} />
              <Route path="Library" element={<div>Resources Page</div>} />
              <Route path="Community" element={<Community />} />
              <Route
                path="FAQ"
                element={<div>Frequently Asked Questions Page</div>}
              />
              <Route path="Settings" element={<div>Settings Page</div>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        ) : (
          <Routes>
            <Route
              path="/signup"
              element={
                <AuthLayout>
                  <SignupPage />
                </AuthLayout>
              }
            />
            <Route
              path="/*"
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
