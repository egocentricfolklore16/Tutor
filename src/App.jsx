import { Children, StrictMode, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Community from "./components/Community/community";
// import LoginPage from "./components/Auth/LoginForm";
import SignupPage from "./components/Auth/SignupForm";
import AuthLayout from "./components/Auth/AuthLayout";
import Layout from "./app/Layout";
import Overview from "./components/Dashboard/Overview";
import Study from "./components/Study/Study";
import LoginPage from "./components/Auth/LoginForm";
import NotFound from "./components/common/NotFound";
import Environ from "./components/Study/studyEnviron/environ";
import supabase from "./lib/supabase";
import ErrorBoundary from "./components/common/ErrorBoundary";

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
              <Route path="Study/:Studyid" element={<Environ />} />
              <Route path="signup" element={<SignupPage />} />
              <Route path="signin" element={<LoginPage />} />
              <Route path="Planner" element={<div>Planner Page</div>} />
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
