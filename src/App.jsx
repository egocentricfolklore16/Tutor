import { Children, StrictMode } from "react"
import Sidebar from "./components/Layout/Sidebar"
import { createBrowserRouter,RouterProvider } from "react-router"


  const router = createBrowserRouter([
        {
          element:(
            <TaskProvider>
            <AppLayout />
          </TaskProvider>
          ),
          
        children: [
        {
          path: "/",
          element: <App/>,
        },
      ]
    }
  ]
)


  function App() {
  return <RouterProvider router={router} />;
}

export default App;


