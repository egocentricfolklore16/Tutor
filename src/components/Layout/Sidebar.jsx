import { Link } from "react-router-dom";
<<<<<<< HEAD
import { useState, useEffect } from "react";
import supabase from "../../lib/supabase";
function Sidebar({ isOpen, toggleSidebar }) {
=======
import { useState } from "react";

function Sidebar({ isOpen, toggleSidebar, user }) {
>>>>>>> 902447310e2af23da33d443174e5972a461e8fa0
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [username, setUsername] = useState("User");
  const [isLoading, setIsLoading] = useState(true);

  // Get username from user metadata or fall back to email
  const getUserName = () => {
    if (!user) return "Guest";
    // Try user_metadata.username first, then user_metadata.userName, then email
    return (
      user.user_metadata?.username ||
      user.user_metadata?.userName ||
      user.email?.split("@")[0] ||
      "User"
    );
  };

  const userName = getUserName();

  const menuItems = [
    {
      name: "Dashboard",
      icon: (
        <svg
          stroke="currentColor"
          fill="currentColor"
          strokeWidth="0"
          viewBox="0 0 1024 1024"
          height="1em"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M946.5 505L534.6 93.4a31.93 31.93 0 0 0-45.2 0L77.5 505c-12 12-18.8 28.3-18.8 45.3 0 35.3 28.7 64 64 64h43.4V908c0 17.7 14.3 32 32 32H448V716h112v224h265.9c17.7 0 32-14.3 32-32V614.3h43.4c17 0 33.3-6.7 45.3-18.8 24.9-25 24.9-65.5-.1-90.5z"></path>
        </svg>
      ),
    },
    {
      name: "Study",
      icon: (
        <svg
          stroke="currentColor"
          fill="currentColor"
          strokeWidth="0"
          viewBox="0 0 512 512"
          height="1em"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M256.016 17.824C153.28 17.824 68 123.394 68 255.984c0 55.725 15.08 106.68 40.17 147.034 42.033 17.992 95.622 27.594 149.34 27.644 51.828.046 103.59-8.786 145.04-25.588C428.41 364.4 444 312.66 444 255.982c0-132.59-85.25-238.156-187.982-238.158h-.002zm1.746 18.7c80.525 0 145.63 65.072 145.63 145.6 0 80.526-65.105 145.63-145.63 145.63-80.53 0-145.6-65.104-145.6-145.63 0-80.53 65.07-145.6 145.6-145.6zm-27.69 40.02c-2.586 5.774-5.09 11.292-7.52 16.843-.543 1.243-1.193 1.538-2.622 1.636-5.436.377-10.875.927-16.25 1.8-1.77.29-2.69.21-3.723-1.294-3.335-4.866-6.823-9.626-10.352-14.565L167.268 97.3c3.778 5.304 7.298 10.362 10.962 15.315.976 1.318.846 2.18.102 3.567-1.747 3.258-3.268 6.647-4.7 10.058-.835 1.984-.724 4.898-2.126 5.967-1.56 1.19-4.355.774-6.615 1.035-4.747.548-9.5 1.08-14.443 1.64l2.727 27.526c6.937-.78 13.47-1.57 20.017-2.195 1.164-.11 2.92.056 3.503.8 3.262 4.16 6.248 8.535 9.602 13.22l-9.477 21.26 25.057 11.216c3.057-6.812 6.036-13.325 8.89-19.894.658-1.518 1.386-2.035 3.143-2.064 4.032-.066 8.11-.283 12.063-1.02 2.293-.426 3.46-.018 4.757 1.844 3.998 5.74 8.2 11.337 12.386 17.076l16.084-11.722 5.537 9.588-19.986 20.01-24.428-14.034-13.035 23.715c8.287 4.824 16.284 9.48 23.567 13.722-2.152 9.085-4.15 17.682-6.29 26.244-.156.616-1.35 1.37-2.072 1.383-6.587.105-13.18.063-19.77.063h-6.585v26.434c.67.318 1.345.628 2.02.935h26.087c.75 3.174 1.477 6.206 2.182 9.203C235.314 310.028 244.536 311 254 311c15.906 0 31.138-2.728 45.236-7.723-8.264-13.37-6.265-30.49 3.118-41.173 13.284-15.13 36.56-16.175 50.794-2.032 1.167 1.16 2.232 2.366 3.21 3.61C374.897 241.53 386 213.237 386 182.412c0-6.172-.454-12.24-1.314-18.18-.236-.12-.427-.22-.686-.35-.132-.068-.31-.047-.664-.09-4.587 7.96-9.21 15.986-13.56 23.54l-27.532-7.566v-27.21h-27.32v27.24c-9.023 2.44-17.696 4.787-26.645 7.206-4.342-7.55-8.898-15.472-13.47-23.426l-18.232 10.235c-1.31-1.825-2.425-3.512-3.685-5.087-.825-1.03-.648-1.725-.028-2.86 2.178-3.98 4.357-7.992 6.06-12.185.805-1.988 1.693-2.632 3.73-2.81 6.453-.557 12.885-1.36 19.616-2.102-.92-9.32-1.82-18.397-2.72-27.522-6.795.652-13.1 1.22-19.396 1.89-1.49.157-2.1-.388-2.888-1.66-2.787-4.495-5.686-8.944-8.89-13.144-1.16-1.518-1.426-2.46-.63-4.148 2.537-5.387 4.9-10.854 7.393-16.438-8.45-3.774-16.663-7.445-25.068-11.2zm-13.455 42.845c12.335.102 22.195 10.073 22.092 22.337-.105 12.433-10.133 22.24-22.595 22.093-12.426-.145-22.047-10.12-21.908-22.72.134-12.086 10.174-21.814 22.41-21.71zm-45.183 214.63c18.315 0 33.066 14.8 33.066 33.41 0 18.608-14.75 33.437-33.064 33.437-18.315 0-33.036-14.83-33.036-33.437 0-18.61 14.72-33.41 33.034-33.41zm165.334.732a33 33 0 0 1 33 33 33 33 0 0 1-33 33 33 33 0 0 1-33-33 33 33 0 0 1 33-33zm-208.372 96.002v.006c.003 0 .005 0 .008.002l-.008-.008zm.008.008c11.484 13.443 24.29 25.074 38.108 34.586l-7.076-26.303c-10.648-2.343-21.013-5.113-31.032-8.283zm253.89 1.52c-8.87 2.67-17.994 5.016-27.33 7.046l-6.42 23.903c12.14-8.723 23.46-19.12 33.75-30.943v-.004zM179.82 443V443l9.565 35.686c11.31 5.452 23.12 9.55 35.31 12.156l-5.048-43.006c-13.472-1.002-26.797-2.645-39.828-4.838zm154.793.252c-10.124 1.667-20.447 2.983-30.85 3.96l-4.802 40.702c9.11-2.72 17.96-6.292 26.522-10.63l9.133-34.028v-.002l-.002-.002zm-49.77 5.297l-.005.03h.006l-.002-.03zm-.005.03c-9.08.502-18.206.753-27.324.753-6.344-.005-12.686-.126-19.012-.377l5.297 44.72c4.04.377 8.112.503 12.216.503 8.003 0 15.89-.626 23.652-1.905l5.17-43.692z"></path>
        </svg>
      ),
    },
    {
      name: "Planner",
      icon: (
        <svg
          stroke="currentColor"
          fill="currentColor"
          strokeWidth="0"
          viewBox="0 0 512 512"
          height="1em"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M139.61 35.5a12 12 0 0 0-17 0L58.93 98.81l-22.7-22.12a12 12 0 0 0-17 0L3.53 92.41a12 12 0 0 0 0 17l47.59 47.4a12.78 12.78 0 0 0 17.61 0l15.59-15.62L156.52 69a12.09 12.09 0 0 0 .09-17zm0 159.19a12 12 0 0 0-17 0l-63.68 63.72-22.7-22.1a12 12 0 0 0-17 0L3.53 252a12 12 0 0 0 0 17L51 316.5a12.77 12.77 0 0 0 17.6 0l15.7-15.69 72.2-72.22a12 12 0 0 0 .09-16.9zM64 368c-26.49 0-48.59 21.5-48.59 48S37.53 464 64 464a48 48 0 0 0 0-96zm432 16H208a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h288a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-320H208a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h288a16 16 0 0 0 16-16V80a16 16 0 0 0-16-16zm0 160H208a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h288a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16z"></path>
        </svg>
      ),
    },
    {
      name: "Progress",
      icon: (
        <svg
          stroke="currentColor"
          fill="currentColor"
          strokeWidth="0"
          viewBox="0 0 24 24"
          height="1em"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g>
            <path fill="none" d="M0 0h24v24H0z"></path>
            <path
              fillRule="nonzero"
              d="M13 1l.001 3.062A8.004 8.004 0 0 1 19.938 11H23v2l-3.062.001a8.004 8.004 0 0 1-6.937 6.937L13 23h-2v-3.062a8.004 8.004 0 0 1-6.938-6.937L1 13v-2h3.062A8.004 8.004 0 0 1 11 4.062V1h2zm-1 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"
            ></path>
          </g>
        </svg>
      ),
    },
    {
      name: "Library",
      icon: (
        <svg
          stroke="currentColor"
          fill="currentColor"
          strokeWidth="0"
          viewBox="0 0 576 512"
          height="1em"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M542.22 32.05c-54.8 3.11-163.72 14.43-230.96 55.59-4.64 2.84-7.27 7.89-7.27 13.17v363.87c0 11.55 12.63 18.85 23.28 13.49 69.18-34.82 169.23-44.32 218.7-46.92 16.89-.89 30.02-14.43 30.02-30.66V62.75c.01-17.71-15.35-31.74-33.77-30.7zM264.73 87.64C197.5 46.48 88.58 35.17 33.78 32.05 15.36 31.01 0 45.04 0 62.75V400.6c0 16.24 13.13 29.78 30.02 30.66 49.49 2.6 149.59 12.11 218.77 46.95 10.62 5.35 23.21-1.94 23.21-13.46V100.63c0-5.29-2.62-10.14-7.27-12.99z"></path>
        </svg>
      ),
    },
    {
      name: "Community",
      icon: (
        <svg
          stroke="currentColor"
          fill="currentColor"
          stroke-width="0"
          viewBox="0 0 24 24"
          height="1em"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g>
            <path fill="none" d="M0 0h24v24H0z"></path>
            <path d="M2 22a8 8 0 1 1 16 0H2zm8-9c-3.315 0-6-2.685-6-6s2.685-6 6-6 6 2.685 6 6-2.685 6-6 6zm7.363 2.233A7.505 7.505 0 0 1 22.983 22H20c0-2.61-1-4.986-2.637-6.767zm-2.023-2.276A7.98 7.98 0 0 0 18 7a7.964 7.964 0 0 0-1.015-3.903A5 5 0 0 1 21 8a4.999 4.999 0 0 1-5.66 4.957z"></path>
          </g>
        </svg>
      ),
    },
    {
      name: "FAQ",
      icon: (
        <svg
          stroke="currentColor"
          fill="currentColor"
          strokeWidth="0"
          viewBox="0 0 384 512"
          height="1em"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M202.021 0C122.202 0 70.503 32.703 29.914 91.026c-7.363 10.58-5.093 25.086 5.178 32.874l43.138 32.709c10.373 7.865 25.132 6.026 33.253-4.148 25.049-31.381 43.63-49.449 82.757-49.449 30.764 0 68.816 19.799 68.816 49.631 0 22.552-18.617 34.134-48.993 51.164-35.423 19.86-82.299 44.576-82.299 106.405V320c0 13.255 10.745 24 24 24h72.471c13.255 0 24-10.745 24-24v-5.773c0-42.86 125.268-44.645 125.268-160.627C377.504 66.256 286.902 0 202.021 0zM192 373.459c-38.196 0-69.271 31.075-69.271 69.271 0 38.195 31.075 69.27 69.271 69.27s69.271-31.075 69.271-69.271-31.075-69.27-69.271-69.27z"></path>
        </svg>
      ),
    },
    {
      name: "Settings",
      icon: (
        <svg
          stroke="currentColor"
          fill="currentColor"
          strokeWidth="0"
          viewBox="0 0 1024 1024"
          height="1em"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M924.8 625.7l-65.5-56c3.1-19 4.7-38.4 4.7-57.8s-1.6-38.8-4.7-57.8l65.5-56a32.03 32.03 0 0 0 9.3-35.2l-.9-2.6a443.74 443.74 0 0 0-79.7-137.9l-1.8-2.1a32.12 32.12 0 0 0-35.1-9.5l-81.3 28.9c-30-24.6-63.5-44-99.7-57.6l-15.7-85a32.05 32.05 0 0 0-25.8-25.7l-2.7-.5c-52.1-9.4-106.9-9.4-159 0l-2.7.5a32.05 32.05 0 0 0-25.8 25.7l-15.8 85.4a351.86 351.86 0 0 0-99 57.4l-81.9-29.1a32 32 0 0 0-35.1 9.5l-1.8 2.1a446.02 446.02 0 0 0-79.7 137.9l-.9 2.6c-4.5 12.5-.8 26.5 9.3 35.2l66.3 56.6c-3.1 18.8-4.6 38-4.6 57.1 0 19.2 1.5 38.4 4.6 57.1L99 625.5a32.03 32.03 0 0 0-9.3 35.2l.9 2.6c18.1 50.4 44.9 96.9 79.7 137.9l1.8 2.1a32.12 32.12 0 0 0 35.1 9.5l81.9-29.1c29.8 24.5 63.1 43.9 99 57.4l15.8 85.4a32.05 32.05 0 0 0 25.8 25.7l2.7.5a449.4 449.4 0 0 0 159 0l2.7-.5a32.05 32.05 0 0 0 25.8-25.7l15.7-85a350 350 0 0 0 99.7-57.6l81.3 28.9a32 32 0 0 0 35.1-9.5l1.8-2.1c34.8-41.1 61.6-87.5 79.7-137.9l.9-2.6c4.5-12.3.8-26.3-9.3-35zM788.3 465.9c2.5 15.1 3.8 30.6 3.8 46.1s-1.3 31-3.8 46.1l-6.6 40.1 74.7 63.9a370.03 370.03 0 0 1-42.6 73.6L721 702.8l-31.4 25.8c-23.9 19.6-50.5 35-79.3 45.8l-38.1 14.3-17.9 97a377.5 377.5 0 0 1-85 0l-17.9-97.2-37.8-14.5c-28.5-10.8-55-26.2-78.7-45.7l-31.4-25.9-93.4 33.2c-17-22.9-31.2-47.6-42.6-73.6l75.5-64.5-6.5-40c-2.4-14.9-3.7-30.3-3.7-45.5 0-15.3 1.2-30.6 3.7-45.5l6.5-40-75.5-64.5c11.3-26.1 25.6-50.7 42.6-73.6l93.4 33.2 31.4-25.9c23.7-19.5 50.2-34.9 78.7-45.7l37.9-14.3 17.9-97.2c28.1-3.2 56.8-3.2 85 0l17.9 97 38.1 14.3c28.7 10.8 55.4 26.2 79.3 45.8l31.4 25.8 92.8-32.9c17 22.9 31.2 47.6 42.6 73.6L781.8 426l6.5 39.9zM512 326c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm79.2 255.2A111.6 111.6 0 0 1 512 614c-29.9 0-58-11.7-79.2-32.8A111.6 111.6 0 0 1 400 502c0-29.9 11.7-58 32.8-79.2C454 401.6 482.1 390 512 390c29.9 0 58 11.6 79.2 32.8A111.6 111.6 0 0 1 624 502c0 29.9-11.7 58-32.8 79.2z"></path>
        </svg>
      ),
    },
  ];

  const toggleSidebar2 = () => {
    toggleSidebar();
  };

  const handleMenuItemClick = (itemName) => {
    setActiveItem(itemName);
  };

  useEffect(() => {
    const fetchUsername = async () => {
      setIsLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setUsername("User");
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Supabase fetch error:", error);
          setUsername(user.email || "User");
        } else {
          setUsername(data?.username || user.email || "User");
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setUsername("User");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsername();
  }, []);

  return (
    <>
      {/* Fixed Toggle Button for Small Screens */}
      <button
        onClick={toggleSidebar2}
        className={`fixed top-4 left-4 z-[1001] cursor-pointer hover:drop-shadow-[0_0_5px_#16A34A] transition-all duration-300 md:hidden bg-white border border-gray-500 rounded-full p-2 ${
          isOpen ? "hidden" : ""
        }`}
      >
        <svg
          stroke="currentColor"
          fill="currentColor"
          strokeWidth="0"
          viewBox="0 0 16 16"
          height="1.5em"
          width="1.5em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M14 2H2a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V3a1 1 0 00-1-1zM2 1a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V3a2 2 0 00-2-2H2z"
            clipRule="evenodd"
          />
          <path fillRule="evenodd" d="M4 14V2h1v12H4z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Sidebar */}
      <div
        className={`${
          isOpen ? "w-60" : "w-16"
        } transition-all z-[1000] duration-200 ease-in-out border-r-4 border-r-green-600 text-black min-h-screen flex flex-col font-['Lexend'] fixed left-0 top-0 h-full bg-white ${
          isOpen ? "block" : "hidden"
        } md:block`}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            {isOpen && <img src="logo.svg" alt="Logo" className="w-12 h-7" />}
            {isOpen && (
              <Link to={"/Dashboard"} className="text-black no-underline">
                <h1 className="ml-3 text-base font-semibold whitespace-nowrap">
                  Hyper Tutor
                </h1>
              </Link>
            )}
          </div>
          <svg
            onClick={toggleSidebar2}
            className="cursor-pointer hover:drop-shadow-[0_0_5px_#16A34A] transition-all duration-300"
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 16 16"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M14 2H2a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V3a1 1 0 00-1-1zM2 1a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V3a2 2 0 00-2-2H2z"
              clipRule="evenodd"
            />
            <path fillRule="evenodd" d="M4 14V2h1v12H4z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-2">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={"/" + item.name}
                className="block text-black no-underline"
              >
                <li
                  className={`
                  ${
                    activeItem === item.name
                      ? "bg-black/15 border-l-2 border-green-600 ml-2"
                      : "hover:bg-black/5 hover:border-l-2 hover:border-green-600 hover:ml-2"
                  }
                  flex items-center h-8 px-3 rounded-lg cursor-pointer 
                  transition-all duration-300 text-xs whitespace-nowrap overflow-hidden
                `}
                  onClick={() => handleMenuItemClick(item.name)}
                >
                  <span className="text-black pr-3">{item.icon}</span>
                  {isOpen && <span>{item.name}</span>}
                </li>
              </Link>
            ))}
          </ul>
        </nav>

        {/* Footer Section */}
        <div className="mt-auto p-4 border-t border-gray-700">
          {/* User Info */}
          <div className="flex items-center mb-4">
            <img
              src="user.png"
              className="w-8 h-8 rounded-full"
              alt="Profile"
            />
            {isOpen && (
              <h4 className="ml-4 text-black text-sm font-medium">
<<<<<<< HEAD
                {isLoading ? "Loading..." : username}
=======
                {userName}
>>>>>>> 902447310e2af23da33d443174e5972a461e8fa0
              </h4>
            )}
          </div>

          {/* New Project Button */}
          <button className="w-full h-8 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-300 text-sm">
            {isOpen ? "+ New Study Session" : "+"}
          </button>

          {/* Help and Feedback */}
          {isOpen && (
            <p className="flex items-center text-gray-700 text-xs mt-4 whitespace-nowrap overflow-hidden">
              <svg
                className="mr-2"
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="0"
                viewBox="0 0 24 24"
                height="1.2em"
                width="1.2em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 6C9.831 6 8.066 7.765 8.066 9.934h2C10.066 8.867 10.934 8 12 8s1.934.867 1.934 1.934c0 .598-.481 1.032-1.216 1.626-.255.207-.496.404-.691.599C11.029 13.156 11 14.215 11 14.333V15h2l-.001-.633c.001-.016.033-.386.441-.793.15-.15.339-.3.535-.458.779-.631 1.958-1.584 1.958-3.182C15.934 7.765 14.169 6 12 6zM11 16H13V18H11z"></path>
                <path d="M12,2C6.486,2,2,6.486,2,12s4.486,10,10,10s10-4.486,10-10S17.514,2,12,2z M12,20c-4.411,0-8-3.589-8-8s3.589-8,8-8 s8,3.589,8,8S16.411,20,12,20z"></path>
              </svg>
              Help and Feedback
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export default Sidebar;
