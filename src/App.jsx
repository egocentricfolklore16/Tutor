import { Children, StrictMode } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./app/Layout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <div>Home Page</div>,
      },
      {
        path: "/Dashboard",
        element: <div>Dashboard Page</div>,
      },
      {
        path: "/Lumo AI",
        element: <div>Lumo AI Page</div>,
      },
      {
        path: "/task",
        element: <div>Task Page</div>,
      },
      {
        path: "/focus",
        element: <div>Focus Page</div>,
      },
      {
        path: "/resources",
        element: <div>Resources Page</div>,
      },
      {
        path: "/projects",
        element: <div>Projects Page</div>,
      },
      {
        path: "/Journal",
        element: <div>Journal Page</div>,
      },
      {
        path: "/FAQ",
        element: <div>FAQ Page</div>,
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
