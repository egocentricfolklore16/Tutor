import { Children, StrictMode } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LoginPage from "./components/Auth/LoginForm";
import SignupPage from "./components/Auth/SignupForm";
import Layout from "./app/Layout";
import Overview from "./components/Dashboard/Overview";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <LoginPage />,
      },
      {
        path: "/Dashboard",
        element: <Overview />,
      },
      {
        path: "/Study",
        element: <SignupPage />,
      },
      {
        path: "/Planner",
        element: <div>Task Page</div>,
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
        element: <div>Projects Page</div>,
      },
      {
        path: "/FAQ",
        element: <div>Journal Page</div>,
      },
      {
        path: "/Settings",
        element: <div>Settings Page</div>,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
