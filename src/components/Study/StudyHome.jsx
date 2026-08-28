import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import supabase from "../../lib/supabase";
import StudyEnvironment from "./studyEnviron/StudyEnvironment";
import LoadingCompanion from "../common/LoadingCompanion";
import {
  BookOpen,
  Play,
  MoreHorizontal,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";

function Study() {
  const toTitleCase = (value) =>
    value
      .toLowerCase()
      .replace(/\b\w/g, (character) => character.toUpperCase());

  const normalizeStatus = (status) => status?.trim().toLowerCase();

  const [session, setSession] = useState({
    subject: "",
    topic: "",
    status: "",
    date: "",
    time: "",
    hours: "",
  });
  const [sessions, setSessions] = useState([]);
  const [fetchError, setFetchError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Fetch sessions from Supabase on mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoadingSessions(true);
        setFetchError("");

        // Get the current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setCurrentUser(user || null);

        if (!user) {
          setFetchError("User not authenticated");
          return;
        }

        const { data, error } = await supabase
          .from("Study")
          .select("*")
          .eq("user_id", user.id); // Filter by current user's ID

        if (error) {
          setFetchError(
            "An error occurred while loading study sessions: " + error.message
          );
          console.error("Supabase fetch error:", error);
        } else {
          setFetchError("");
          setSessions(data || []);
        }
      } catch (err) {
        setFetchError("An unexpected error occurred while loading sessions");
        console.error("Unexpected error:", err);
      } finally {
        setIsLoadingSessions(false);
      }
    };
    fetchSessions();
  }, []);

  const [dropdownIndex, setDropdownIndex] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const formRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.openCreateSession) {
      setIsOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const getTypeIcon = () => {
    return <BookOpen className="h-4 w-4" />;
  };

  const getPriorityColor = (status) => {
    switch (normalizeStatus(status)) {
      case "very important":
        return "border-l-red-300 bg-red-50";
      case "not so important":
        return "border-l-green-300 bg-green-50";
      case "medium":
        return "border-l-orange-300 bg-orange-50";
      default:
        return "border-l-gray-300 bg-gray-50";
    }
  };

  const getStatusBadge = (status) => {
    switch (normalizeStatus(status)) {
      case "very important":
        return (
            <span className="px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-full flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Very Important
          </span>
        );
      case "not so important":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full">
            Not so Important
          </span>
        );
      case "medium":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-orange-50 text-orange-700 rounded-full">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
            {status}
          </span>
        );
    }
  };

  const toggleShow = () => {
    setIsOpen(!isOpen);
  };

  const setLoadingState = (id, type, isLoading) => {
    setLoadingStates((prev) => ({
      ...prev,
      [`${id}_${type}`]: isLoading,
    }));
  };

  const addSession = async (e) => {
    e.preventDefault();
    if (
      session.subject &&
      session.topic &&
      session.status &&
      session.date &&
      session.time &&
      session.hours
    ) {
      try {
        setLoadingState("form", "submit", true);

        // Get the current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setFetchError("User not authenticated");
          return;
        }

        // Save to Supabase with user_id
        const { data, error } = await supabase
          .from("Study")
          .insert([
            {
              Subject: session.subject,
              Topic: session.topic,
              Status: session.status,
              Date: session.date,
              Start: session.time,
              Duration: session.hours,
              muted: false,
              user_id: user.id, // Add user_id to the new session
            },
          ])
          .select("*");

        if (error) {
          setFetchError("Failed to create session: " + error.message);
          console.error("Supabase insert error:", error);
        } else if (data && data.length > 0) {
          setSessions((prev) => [...prev, data[0]]);
          setSession({
            subject: "",
            topic: "",
            status: "",
            date: "",
            time: "",
            hours: "",
          });
          setIsOpen(false);
          setFetchError("");
        }
      } catch (err) {
        setFetchError("An unexpected error occurred while creating session");
        console.error("Unexpected error:", err);
      } finally {
        setLoadingState("form", "submit", false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSession((prev) => ({
      ...prev,
      [name]: name === "subject" || name === "topic" ? toTitleCase(value) : value,
    }));
  };

  const handleDropdown = (index) => {
    setDropdownIndex(dropdownIndex === index ? null : index);
  };

  const handleMuteToggle = async (id) => {
    if (!id) {
      setFetchError("Cannot toggle mute: Invalid session ID");
      return;
    }

    // Find the session to toggle
    const sessionToToggle = sessions.find((s) => s.id === id);
    if (!sessionToToggle) {
      setFetchError("Session not found");
      return;
    }

    const newMutedState = !sessionToToggle.muted;

    try {
      setLoadingState(id, "mute", true);

      // Update the muted state in Supabase
      const { error } = await supabase
        .from("Study")
        .update({ muted: newMutedState })
        .eq("id", id);

      if (error) {
        setFetchError("Failed to update mute state: " + error.message);
        console.error("Supabase update error:", error);
      } else {
        // Update local state to reflect change
        setSessions((prevSessions) =>
          prevSessions.map((session) =>
            session.id === id ? { ...session, muted: newMutedState } : session
          )
        );
        setFetchError("");
        setDropdownIndex(null);
      }
    } catch (err) {
      setFetchError("An unexpected error occurred while updating session");
      console.error("Unexpected error:", err);
    } finally {
      setLoadingState(id, "mute", false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) {
      setFetchError("Cannot delete: Invalid session ID");
      return;
    }

    try {
      setLoadingState(id, "delete", true);

      const [{ error: notesError }, { error: flashcardsError }, { error: resourcesError }] = await Promise.all([
        supabase.from("notes").delete().eq("session_id", id),
        supabase.from("flashcards").delete().eq("session_id", id),
        supabase.from("resources").delete().eq("session_id", id),
      ]);

      if (notesError || flashcardsError || resourcesError) {
        const childError = notesError || flashcardsError || resourcesError;
        setFetchError("Failed to delete session items: " + childError.message);
        return;
      }

      const { error } = await supabase.from("Study").delete().eq("id", id);

      if (error) {
        setFetchError("Failed to delete session: " + error.message);
        console.error("Supabase delete error:", error);
      } else {
        // Update local state immediately
        setSessions((prevSessions) =>
          prevSessions.filter((session) => session.id !== id)
        );
        setFetchError("");
        setDropdownIndex(null);
      }
    } catch (err) {
      setFetchError("An unexpected error occurred while deleting session");
      console.error("Unexpected error:", err);
    } finally {
      setLoadingState(id, "delete", false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-container")) {
        setDropdownIndex(null);
      }
    };

    if (dropdownIndex !== null) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [dropdownIndex]);

  return (
    <div className="relative min-h-screen">
      {activeSession && (
        <StudyEnvironment
          session={activeSession}
          onClose={() => setActiveSession(null)}
          user={currentUser || undefined}
        />
      )}
      <div className="p-6">
        {fetchError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300 text-center font-medium">
            {fetchError}
            <button
              onClick={() => setFetchError("")}
              className="ml-2 text-red-800 hover:text-red-900"
            >
              <X className="h-4 w-4 inline" />
            </button>
          </div>
        )}
        <h1 className="px-10 lg:px-0 text-2xl font-bold text-gray-800 mb-6">
          Study Sessions
        </h1>

        {isLoadingSessions ? (
          <LoadingCompanion message="Loading your study sessions..." />
        ) : sessions.length === 0 ? (
          <div className="">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">No study sessions yet</p>
            <p className="text-gray-400">
              Click the + button to create your first session
            </p>
          </div>
        ) : (
          <div className="w-full grid gap-3 gap-y-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 [box-shadow:rgba(128,128,128,0.5)_3px_3px_6px_0px_inset,rgba(255,255,255,0.5)_-3px_-3px_6px_1px_inset] p-2 overflow-y-auto">
            {sessions.map((sessionItem, index) => {
              const isMuted = sessionItem.muted;
              const isDeleting = loadingStates[`${sessionItem.id}_delete`];
              const isMuting = loadingStates[`${sessionItem.id}_mute`];

              return (
                <div
                  key={sessionItem.id || index}
                  className={`border-l-4 rounded-r-lg p-4 transition-all w-full lg:w-[390px] hover:shadow-md cursor-pointer relative ${
                    isMuted
                      ? "bg-gray-200 border-l-gray-400"
                      : getPriorityColor(sessionItem.Status)
                  } ${isDeleting ? "opacity-50" : ""}`}
                  style={
                    isMuted ? { filter: "grayscale(1)", color: "#888" } : {}
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          {getTypeIcon()}
                        </div>
                        {!isMuted && getStatusBadge(sessionItem.Status)}
                      </div>

                      <h2
                        className={`font-semibold mb-1 ${
                          isMuted ? "text-gray-500" : "text-gray-800"
                        }`}
                      >
                        {toTitleCase(sessionItem.Subject || "")}
                      </h2>
                      <h3
                        className={`mb-1 ${
                          isMuted ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {toTitleCase(sessionItem.Topic || "")}
                      </h3>
                      <p
                        className={`text-sm mb-1 ${
                          isMuted ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {sessionItem.Date}{" "}
                        {sessionItem.Start && (
                          <span className="ml-2 text-gray-400">
                            at {sessionItem.Start}
                          </span>
                        )}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          isMuted ? "text-gray-400" : "text-gray-700"
                        }`}
                      >
                        {sessionItem.Duration} hour(s)
                      </p>
                    </div>

                    <div className="flex flex-col items-center gap-2 ml-4 relative dropdown-container">
                      <button
                        className="flex items-center gap-1 px-3 py-2 bg-green-200 text-black text-sm font-medium rounded-lg hover:bg-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() =>
                          navigate(
                            `/Study/${encodeURIComponent(sessionItem.id)}`
                          )
                        }
                        disabled={isDeleting || isMuting}
                      >
                        <Play className="h-3 w-3" />
                        Start
                      </button>

                      <button
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                        onClick={() => handleDropdown(index)}
                        disabled={isDeleting || isMuting}
                      >
                        {isDeleting || isMuting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </button>

                      {dropdownIndex === index && !isDeleting && !isMuting && (
                        <div className="absolute right-0 top-10 bg-white border rounded shadow-lg z-10 min-w-[120px]">
                          <button
                            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                            onClick={() => handleMuteToggle(sessionItem.id)}
                            disabled={isMuting}
                          >
                            {isMuting ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                {isMuted ? "Unmuting..." : "Muting..."}
                              </span>
                            ) : isMuted ? (
                              "Unmute"
                            ) : (
                              "Mute"
                            )}
                          </button>
                          <button
                            className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 disabled:opacity-50"
                            onClick={() => handleDelete(sessionItem.id)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Deleting...
                              </span>
                            ) : (
                              "Delete"
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed Overlay Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-2xl backdrop-saturate-600"
          style={{ background: "rgba(255,255,255,0.05)" }}
          onClick={(e) => {
            if (formRef.current && !formRef.current.contains(e.target)) {
              setIsOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md" ref={formRef}>
            <form
              className="bg-white p-6 rounded-lg shadow-xl"
              onSubmit={addSession}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  Create Study Session
                </h2>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loadingStates.form_submit}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    required
                    type="text"
                    name="subject"
                    value={session.subject}
                    onChange={handleChange}
                    placeholder="e.g., Mathematics, Biology"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    disabled={loadingStates.form_submit}
                  />
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topic *
                  </label>
                  <input
                    required
                    type="text"
                    name="topic"
                    value={session.topic}
                    onChange={handleChange}
                    placeholder="e.g., Calculus, Cell Division"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    disabled={loadingStates.form_submit}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    required
                    name="status"
                    value={session.status}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    disabled={loadingStates.form_submit}
                  >
                    <option value="">Select status</option>
                    <option value="Very Important">Very Important</option>
                    <option value="Medium">Medium</option>
                    <option value="Not so Important">Not so Important</option>
                  </select>
                </div>

                {/* Date */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      required
                      type="date"
                      name="date"
                      value={session.date}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                      disabled={loadingStates.form_submit}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time *
                    </label>
                    <input
                      required
                      type="time"
                      name="time"
                      value={session.time}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                      disabled={loadingStates.form_submit}
                    />
                  </div>
                </div>

                {/* Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Study Duration (hours) *
                  </label>
                  <input
                    required
                    type="number"
                    name="hours"
                    value={session.hours}
                    onChange={handleChange}
                    placeholder="1"
                    min="0.5"
                    step="0.5"
                    max="12"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    disabled={loadingStates.form_submit}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium mt-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loadingStates.form_submit}
              >
                {loadingStates.form_submit ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Session...
                  </>
                ) : (
                  "Create Session"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={toggleShow}
        className="fixed bottom-6 right-6 bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out hover:scale-110 z-40"
        title="Create New Session"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>
    </div>
  );
}

export default Study;
