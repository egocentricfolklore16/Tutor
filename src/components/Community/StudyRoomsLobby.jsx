import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  Search,
  Clock,
  Globe,
  Lock,
  RefreshCw,
  Loader2,
  AlertCircle,
  Play,
  Sparkles,
  X,
  MessageSquare,
} from "lucide-react";
import supabase from "../../lib/supabase";
import Avatar from "../common/Avatar";

export default function StudyRoomsLobby({ user, userSubjects = [] }) {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Filters
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [myGroupsOnly, setMyGroupsOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Room Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSubject, setCreateSubject] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createIsPublic, setCreateIsPublic] = useState(true);
  const [createCapacity, setCreateCapacity] = useState(10);
  const [createFocusMinutes, setCreateFocusMinutes] = useState(25);
  const [createBreakMinutes, setCreateBreakMinutes] = useState(5);
  const [createGroupId, setCreateGroupId] = useState("");
  const [myGroups, setMyGroups] = useState([]);
  const [creating, setCreating] = useState(false);

  // Initial Goal Modal state prior to join
  const [joiningRoom, setJoiningRoom] = useState(null);
  const [userGoal, setUserGoal] = useState("");
  const [joinError, setJoinError] = useState(null);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const subjectParam = selectedSubject === "all" ? null : selectedSubject;
      const { data, error } = await supabase.rpc("list_study_rooms", {
        p_subject: subjectParam,
        p_group_id: null,
      });

      if (error) throw error;
      setRooms(data || []);
    } catch (err) {
      console.error("Error fetching study rooms:", err);
      setErrorMsg("Failed to load study rooms.");
    } finally {
      setLoading(false);
    }
  }, [selectedSubject]);

  // Fetch my groups for create room group assignment
  useEffect(() => {
    if (!user) return;
    async function loadMyGroups() {
      const { data } = await supabase
        .from("study_group_members")
        .select("group_id, group:study_groups(id, name)")
        .eq("user_id", user.id);
      if (data) {
        setMyGroups(data.map((d) => d.group).filter(Boolean));
      }
    }
    loadMyGroups();
  }, [user]);

  useEffect(() => {
    fetchRooms();

    const channelName = `public:study_rooms:${crypto.randomUUID()}`;
    const channel = supabase.channel(channelName);

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "study_rooms" },
      () => {
        fetchRooms();
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRooms]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!createName.trim() || !createSubject.trim()) return;

    setCreating(true);
    try {
      const roomPayload = {
        name: createName.trim(),
        subject: createSubject.trim(),
        description: createDesc.trim(),
        is_public: createIsPublic,
        capacity: Math.max(2, Math.min(50, Number(createCapacity))),
        focus_minutes: Math.max(5, Math.min(120, Number(createFocusMinutes))),
        break_minutes: Math.max(1, Math.min(60, Number(createBreakMinutes))),
        group_id: createGroupId || null,
        created_by: user.id,
      };

      const { data: newRoom, error: createErr } = await supabase
        .from("study_rooms")
        .insert(roomPayload)
        .select("id")
        .single();

      if (createErr) throw createErr;

      setShowCreateModal(false);
      // Join created room with initial goal
      setJoiningRoom({ id: newRoom.id, name: createName });
    } catch (err) {
      console.error("Error creating study room:", err);
      alert(err.message || "Failed to create study room.");
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmJoin = async (e) => {
    e.preventDefault();
    if (!joiningRoom) return;
    setJoinError(null);

    try {
      const { data: success, error } = await supabase.rpc("join_study_room", {
        p_room_id: joiningRoom.id,
        p_goal: userGoal.trim() || "Studying",
      });

      if (error) {
        if (error.message?.includes("full") || error.message?.includes("closed")) {
          setJoinError("This room is full or has been closed.");
          return;
        }
        throw error;
      }

      navigate(`/community/rooms/${joiningRoom.id}`);
    } catch (err) {
      console.error("Error joining room:", err);
      setJoinError(err.message || "Failed to join room.");
    }
  };

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    if (myGroupsOnly && !r.group_id) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.name?.toLowerCase().includes(q);
      const matchSubj = r.subject?.toLowerCase().includes(q);
      const matchHost = r.host?.full_name?.toLowerCase().includes(q) || r.host?.username?.toLowerCase().includes(q);
      return matchName || matchSubj || matchHost;
    }
    return true;
  });

  const availableSubjects = Array.from(
    new Set([...userSubjects, ...rooms.map((r) => r.subject).filter(Boolean)])
  );

  return (
    <div className="space-y-6">
      {/* Lobby Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Virtual Study Rooms
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Co-working focus rooms with synchronized timers and live video/chat
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchRooms}
            className="rounded-2xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Refresh rooms"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateSubject(userSubjects[0] || "General Study");
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> Create Room
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search study rooms..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#14171c] dark:text-white"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setSelectedSubject("all")}
            className={`rounded-2xl px-3.5 py-1.5 text-xs font-bold transition shrink-0 ${
              selectedSubject === "all"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-[#14171c] dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            All Subjects
          </button>
          {availableSubjects.map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSelectedSubject(sub)}
              className={`rounded-2xl px-3.5 py-1.5 text-xs font-bold transition shrink-0 ${
                selectedSubject === sub
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-[#14171c] dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setMyGroupsOnly(!myGroupsOnly)}
          className={`rounded-2xl px-3.5 py-1.5 text-xs font-bold transition shrink-0 ${
            myGroupsOnly
              ? "bg-teal-600 text-white"
              : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-[#14171c] dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          My Groups Only
        </button>
      </div>

      {/* Room Cards Grid */}
      {loading ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#14171c]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-3 text-xs text-slate-500">Loading virtual study rooms...</p>
        </div>
      ) : errorMsg ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <AlertCircle className="h-8 w-8 text-rose-600" />
          <p className="mt-2 text-xs font-bold text-rose-800 dark:text-rose-200">{errorMsg}</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#14171c]">
          <Users className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
            No active study rooms
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-xs">
            Be the first to create a focus room and start studying with peers!
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> Create First Room
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => {
            const isFull = (room.active_count || 0) >= room.capacity;
            const phaseLabel = room.phase === "break" ? "Break" : room.phase === "focus" ? "Focus" : "Idle";

            return (
              <div
                key={room.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-500/60 dark:border-slate-800 dark:bg-[#14171c]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-2xl bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {room.subject}
                    </span>
                    <span
                      className={`rounded-2xl px-2.5 py-0.5 text-[10px] font-bold ${
                        room.phase === "focus"
                          ? "bg-emerald-600 text-white"
                          : room.phase === "break"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {phaseLabel}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-black text-slate-900 dark:text-white line-clamp-1">
                    {room.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {room.description || "Silent co-working and focus session."}
                  </p>

                  {/* Timer & Host Info */}
                  <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-emerald-600" />
                      {room.focus_minutes}m / {room.break_minutes}m
                    </span>

                    {room.host && (
                      <div className="flex items-center gap-1.5">
                        <Avatar
                          src={room.host.user_img}
                          name={room.host.full_name}
                          username={room.host.username}
                          size="xs"
                        />
                        <span className="truncate max-w-[100px]">
                          {room.host.full_name || room.host.username}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Users className="h-3.5 w-3.5 text-emerald-600" />
                    <span>
                      {room.active_count || 0} / {room.capacity} studying
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setJoiningRoom(room);
                      setUserGoal("");
                      setJoinError(null);
                    }}
                    disabled={isFull && !room.is_member}
                    className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-bold text-white shadow-xs transition ${
                      isFull && !room.is_member
                        ? "bg-slate-300 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>{room.is_member ? "Rejoin" : isFull ? "Full" : "Join"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#14171c]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Create Virtual Study Room
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Calculus Pomodoro Sprint"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={createSubject}
                  onChange={(e) => setCreateSubject(e.target.value)}
                  placeholder="e.g. Mathematics"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="What is this study room focusing on?"
                  rows={2}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Capacity (2-50)
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={50}
                    value={createCapacity}
                    onChange={(e) => setCreateCapacity(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Focus (mins)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={createFocusMinutes}
                    onChange={(e) => setCreateFocusMinutes(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Break (mins)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={createBreakMinutes}
                    onChange={(e) => setCreateBreakMinutes(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
                  />
                </div>
              </div>

              {myGroups.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Associate with Group (Optional)
                  </label>
                  <select
                    value={createGroupId}
                    onChange={(e) => setCreateGroupId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
                  >
                    <option value="">None (Public Room)</option>
                    {myGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-2xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Create & Launch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goal Prompt Modal before joining */}
      {joiningRoom && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onClick={() => setJoiningRoom(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#14171c]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Joining {joiningRoom.name}
              </h3>
              <button
                type="button"
                onClick={() => setJoiningRoom(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
              What are you working on during this session?
            </p>

            <form onSubmit={handleConfirmJoin} className="space-y-4">
              <input
                type="text"
                value={userGoal}
                onChange={(e) => setUserGoal(e.target.value)}
                placeholder="e.g. Solving 5 physics problems"
                autoFocus
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
              />

              {joinError && (
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {joinError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setJoiningRoom(null)}
                  className="rounded-2xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Enter Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
