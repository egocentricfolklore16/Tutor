import React from 'react'
import Layout from './Layout'
import { createBrowserRouter, RouterProvider } from "react-router-dom";


const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [

      
    ]
  }
])
function Study() {
  return (
    <>
        <Layout />
    </>
  )
}

export default Study