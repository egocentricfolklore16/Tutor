import { Children, StrictMode } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import CommunityComingSoon from "./components/Community/community";
import LoginPage from "./components/Auth/LoginForm";
import SignupPage from "./components/Auth/SignupForm";
import Layout from "./app/Layout";
import Overview from "./components/Dashboard/Overview";
import Study from "./components/Study/Study";
import Card from "./components/common/NotFound";
import NotFound from "./components/common/NotFound";
import { SidebarProvider } from "./contexts/SidebarContext";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <Overview />,
      },
      {
        path: "/Dashboard",
        element: <Overview />,
      },
      {
        path: "/Study",
        element: <Study />,
      },
      {
        path: "/Planner",
        element: <LoginPage />,
      },
      {
        path: "/Progress",
        element: <div>Focus Page</div>,
      },
      {
        path: "/Library",
        element: <div>Resources Page</div>,
      },
      {
        path: "/Community",
        element: <CommunityComingSoon />,
      },
      {
        path: "/FAQ",
        element: <div>Journal Page</div>,
      },
      {
        path: "/Settings",
        element: <div>Settings Page</div>,
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

function App() {
  return (
    <SidebarProvider>
      <RouterProvider router={router} />
    </SidebarProvider>
  );
}

export default App;
