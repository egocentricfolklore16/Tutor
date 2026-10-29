import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  Crown,
  Users,
  MessageSquare,
  Send,
  LogOut,
  Play,
  Pause,
  SkipForward,
  Settings,
  Volume2,
  VolumeX,
  Smile,
  Share2,
  UserPlus,
  Loader2,
  AlertCircle,
  Check,
  X,
  Edit2,
  Sparkles,
} from "lucide-react";
import supabase from "../../lib/supabase";
import Avatar from "../common/Avatar";
import FriendPicker from "./FriendPicker";
import { sanitizeUrl } from "../../lib/communityChat";

export default function VirtualStudyRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [room, setRoom] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomError, setRoomError] = useState(null);

  // Goal & goal editing
  const [userGoal, setUserGoal] = useState("Studying");
  const [editingGoal, setEditingGoal] = useState(false);
  const [newGoalInput, setNewGoalInput] = useState("");

  // Server clock offset (ms)
  const [clockOffset, setClockOffset] = useState(0);

  // Timer local state
  const [remainingSec, setRemainingSec] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const prevPhaseRef = useRef(null);

  // Chat state (broadcast)
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const broadcastChannelRef = useRef(null);

  // Share resource modal / Friend invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [resourceLinkInput, setResourceLinkInput] = useState("");

  // Host settings modal
  const [showHostSettings, setShowHostSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCapacity, setEditCapacity] = useState(10);

  // Play soft chime on phase change
  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  }, [soundEnabled]);

  // Fetch roster
  const fetchRoster = useCallback(async () => {
    if (!roomId) return;
    try {
      const { data, error } = await supabase.rpc("get_room_roster", {
        p_room_id: roomId,
      });
      if (error) throw error;
      setRoster(data || []);
    } catch (err) {
      console.error("Error fetching roster:", err);
    }
  }, [roomId]);

  // 1. Initial Auth & Join Room
  useEffect(() => {
    let isMounted = true;

    async function initRoom() {
      setLoading(true);
      setRoomError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthenticated");
        if (isMounted) setCurrentUserId(user.id);

        // Calculate server clock offset with a lightweight fetch
        const startMs = Date.now();
        const { data: roomRows, error: roomErr } = await supabase
          .from("study_rooms")
          .select("*, host:created_by(id, username, full_name, user_img)")
          .eq("id", roomId)
          .maybeSingle();

        const endMs = Date.now();
        const estimatedServerMs = startMs + Math.round((endMs - startMs) / 2);
        const offset = Date.now() - estimatedServerMs;
        if (isMounted) setClockOffset(offset);

        if (roomErr || !roomRows) {
          throw new Error("Study room not found or closed.");
        }

        if (roomRows.status === "closed") {
          throw new Error("This study room has been closed by the host.");
        }

        if (isMounted) {
          setRoom(roomRows);
          setEditName(roomRows.name);
          setEditCapacity(roomRows.capacity);
        }

        // Call RPC join_study_room
        const { error: joinErr } = await supabase.rpc("join_study_room", {
          p_room_id: roomId,
          p_goal: "Studying",
        });

        if (joinErr) {
          const errMsg = joinErr.message?.toLowerCase() || "";
          if (errMsg.includes("full") || errMsg.includes("closed")) {
            throw new Error("This study room is full or closed.");
          } else if (errMsg.includes("private") || errMsg.includes("approval")) {
            throw new Error("This study room is private and requires host approval.");
          } else if (errMsg.includes("already") || errMsg.includes("member")) {
            // Already a member - proceed smoothly into room
          } else {
            console.warn("join_study_room notice:", joinErr.message);
          }
        }

        await fetchRoster();
      } catch (err) {
        console.error("Error initializing room:", err);
        if (isMounted) setRoomError(err.message || "Failed to enter study room.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initRoom();

    return () => {
      isMounted = false;
    };
  }, [roomId, fetchRoster]);

  // 2. Room Heartbeat (every 45s while visible) & Leave on cleanup
  useEffect(() => {
    if (!roomId || roomError) return;

    const interval = setInterval(async () => {
      if (document.visibilityState === "visible") {
        const { data: active, error } = await supabase.rpc("room_heartbeat", {
          p_room_id: roomId,
        });

        if (error || active === false) {
          // Re-join if heartbeat failed
          await supabase.rpc("join_study_room", {
            p_room_id: roomId,
            p_goal: userGoal,
          });
        }
      }
    }, 45000);

    const handleLeave = () => {
      try {
        void supabase.rpc("leave_study_room", { p_room_id: roomId });
      } catch (e) {
        console.warn("leave_study_room warning:", e);
      }
    };

    window.addEventListener("pagehide", handleLeave);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pagehide", handleLeave);
      handleLeave();
    };
  }, [roomId, userGoal, roomError]);

  // 3. Realtime Subscriptions for study_rooms & study_room_members
  useEffect(() => {
    if (!roomId) return;

    const channelName = `room_db:${roomId}:${crypto.randomUUID()}`;
    const roomSub = supabase.channel(channelName);

    roomSub
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "study_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const newRoom = payload.new;
          if (newRoom.status === "closed") {
            setRoomError("The host has closed this room.");
            return;
          }
          setRoom((prev) => ({ ...prev, ...newRoom }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_room_members",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchRoster();
        }
      );

    roomSub.subscribe();

    const rosterInterval = setInterval(fetchRoster, 30000);

    return () => {
      supabase.removeChannel(roomSub);
      clearInterval(rosterInterval);
    };
  }, [roomId, fetchRoster]);

  // 4. Ephemeral Broadcast & Presence Chat Channel
  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const channelName = `room:${roomId}:${crypto.randomUUID()}`;
    const bChannel = supabase.channel(channelName, {
      config: { broadcast: { self: true } },
    });

    bChannel
      .on("broadcast", { event: "chat" }, (payload) => {
        setChatMessages((prev) => [...prev.slice(-49), payload.payload]);
      })
      .on("broadcast", { event: "reaction" }, (payload) => {
        setChatMessages((prev) => [
          ...prev.slice(-49),
          {
            id: Date.now(),
            type: "reaction",
            user_id: payload.payload.user_id,
            name: payload.payload.name,
            emoji: payload.payload.emoji,
            created_at: new Date().toISOString(),
          },
        ]);
      });

    bChannel.subscribe();

    broadcastChannelRef.current = bChannel;

    return () => {
      if (broadcastChannelRef.current) {
        supabase.removeChannel(broadcastChannelRef.current);
        broadcastChannelRef.current = null;
      }
    };
  }, [roomId, currentUserId]);

  // 5. Shared Timer Engine
  useEffect(() => {
    if (!room) return;

    const phase = room.phase || "idle";
    const phaseStartedAt = room.phase_started_at;
    const focusMins = room.focus_minutes || 25;
    const breakMins = room.break_minutes || 5;

    // Trigger chime if phase changed
    if (prevPhaseRef.current && prevPhaseRef.current !== phase) {
      playChime();
    }
    prevPhaseRef.current = phase;

    if (phase === "idle" || !phaseStartedAt) {
      setRemainingSec(focusMins * 60);
      return;
    }

    const timerInterval = setInterval(() => {
      const nowServer = Date.now() - clockOffset;
      const startedMs = Date.parse(phaseStartedAt);
      const elapsedSec = Math.floor((nowServer - startedMs) / 1000);
      const totalSec = (phase === "focus" ? focusMins : breakMins) * 60;
      const remaining = Math.max(0, totalSec - elapsedSec);

      setRemainingSec(remaining);

      if (remaining === 0) {
        clearInterval(timerInterval);
        // Random 0-1s jitter before calling advance_room_phase
        setTimeout(async () => {
          const { data: updatedRoom, error } = await supabase.rpc("advance_room_phase", {
            p_room_id: roomId,
          });
          if (!error && updatedRoom) {
            setRoom((prev) => ({ ...prev, ...updatedRoom }));
          }
        }, Math.random() * 1000);
      }
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, [room, clockOffset, roomId, playChime]);

  // Host Actions
  const handleSetPhase = async (newPhase) => {
    if (!roomId) return;
    try {
      const { data: updatedRoom, error } = await supabase.rpc("set_room_phase", {
        p_room_id: roomId,
        p_phase: newPhase,
      });

      if (error) throw error;
      if (updatedRoom) setRoom((prev) => ({ ...prev, ...updatedRoom }));
    } catch (err) {
      console.error("Error setting room phase:", err);
    }
  };

  const handleCloseRoom = async () => {
    if (!roomId || !window.confirm("Close this study room for everyone?")) return;
    try {
      const { error } = await supabase
        .from("study_rooms")
        .update({ status: "closed" })
        .eq("id", roomId);

      if (error) throw error;
      navigate("/community/rooms");
    } catch (err) {
      console.error("Error closing room:", err);
    }
  };

  const handleUpdateHostSettings = async (e) => {
    e.preventDefault();
    if (!roomId) return;
    try {
      const { error } = await supabase
        .from("study_rooms")
        .update({
          name: editName.trim(),
          capacity: Math.max(2, Math.min(50, Number(editCapacity))),
        })
        .eq("id", roomId);

      if (error) throw error;
      setShowHostSettings(false);
    } catch (err) {
      console.error("Error updating host settings:", err);
    }
  };

  // User Edit Goal
  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!roomId || !newGoalInput.trim()) return;
    try {
      const { error } = await supabase.rpc("set_room_goal", {
        p_room_id: roomId,
        p_goal: newGoalInput.trim(),
      });
      if (error) throw error;

      setUserGoal(newGoalInput.trim());
      setEditingGoal(false);
      fetchRoster();
    } catch (err) {
      console.error("Error setting goal:", err);
    }
  };

  // Chat Send
  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !broadcastChannelRef.current || !currentUserId) return;

    const me = roster.find((r) => r.user_id === currentUserId);
    const msgObj = {
      id: Date.now(),
      user_id: currentUserId,
      name: me?.full_name || me?.username || "Learner",
      user_img: me?.user_img,
      text: chatInput.trim(),
      created_at: new Date().toISOString(),
    };

    broadcastChannelRef.current.send({
      type: "broadcast",
      event: "chat",
      payload: msgObj,
    });

    setChatInput("");
  };

  const handleSendEmoji = (emoji) => {
    if (!broadcastChannelRef.current || !currentUserId) return;
    const me = roster.find((r) => r.user_id === currentUserId);
    broadcastChannelRef.current.send({
      type: "broadcast",
      event: "reaction",
      payload: {
        user_id: currentUserId,
        name: me?.full_name || me?.username || "Learner",
        emoji,
      },
    });
  };

  const handleShareResource = (e) => {
    e.preventDefault();
    if (!resourceLinkInput.trim() || !broadcastChannelRef.current) return;

    const me = roster.find((r) => r.user_id === currentUserId);
    const msgObj = {
      id: Date.now(),
      type: "resource",
      user_id: currentUserId,
      name: me?.full_name || me?.username || "Learner",
      text: `Shared link: ${resourceLinkInput.trim()}`,
      link: resourceLinkInput.trim(),
      created_at: new Date().toISOString(),
    };

    broadcastChannelRef.current.send({
      type: "broadcast",
      event: "chat",
      payload: msgObj,
    });

    setResourceLinkInput("");
    setShowShareModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        <p className="mt-3 text-sm font-bold">Entering virtual study room...</p>
      </div>
    );
  }

  if (roomError || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <p className="mt-3 text-lg font-black">{roomError || "Room Unavailable"}</p>
        <button
          type="button"
          onClick={() => navigate("/community/rooms")}
          className="mt-5 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
        >
          Return to Rooms Lobby
        </button>
      </div>
    );
  }

  const isHost = room.created_by === currentUserId;
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const phaseColor =
    room.phase === "focus"
      ? "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/40"
      : room.phase === "break"
      ? "from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/40"
      : "from-slate-800 to-slate-900 text-slate-300 border-slate-700";

  return (
    <div className="fixed inset-0 z-[100] md:static flex flex-col h-[100dvh] w-screen bg-slate-950 text-white overflow-hidden">
      {/* Top Header Navigation */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-[#14171c] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/community/rooms")}
            className="rounded-2xl border border-slate-800 p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            title="Leave Room"
          >
            <LogOut className="h-4 w-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-emerald-950 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                {room.subject}
              </span>
              <h1 className="text-base font-black text-white truncate max-w-[180px] sm:max-w-xs">
                {room.name}
              </h1>
            </div>
            <p className="text-[11px] text-slate-400">
              {roster.length} / {room.capacity} studying · {room.cycles_completed || 0} cycles done
            </p>
          </div>
        </div>

        {/* Top Controls: Sound Toggle, Invite, Host Settings */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`rounded-2xl p-2 text-xs font-bold transition ${
              soundEnabled
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
            title={soundEnabled ? "Phase chime ON" : "Phase chime OFF"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </button>

          {isHost && (
            <button
              type="button"
              onClick={() => setShowHostSettings(true)}
              className="rounded-2xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
              title="Host Controls"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Split Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Left / Center Column: Timer & Roster */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Main Shared Circular Countdown Timer */}
          <div
            className={`relative flex flex-col items-center justify-center rounded-3xl border bg-gradient-to-b ${phaseColor} p-8 text-center shadow-2xl transition-all duration-300`}
          >
            <span className="uppercase text-xs font-black tracking-widest opacity-80">
              {room.phase === "focus"
                ? "🎯 FOCUS PHASE"
                : room.phase === "break"
                ? "☕ BREAK PHASE"
                : "⏸ IDLE"}
            </span>

            <div className="mt-3 text-6xl font-black tracking-tighter sm:text-7xl font-mono">
              {formattedTime}
            </div>

            <p className="mt-2 text-xs font-semibold opacity-70">
              {room.phase === "focus"
                ? `${room.focus_minutes}m focus session in progress`
                : room.phase === "break"
                ? `${room.break_minutes}m break time`
                : "Waiting for host to start timer"}
            </p>

            {/* Host Timer Controls */}
            {isHost && (
              <div className="mt-6 flex items-center gap-2">
                {room.phase === "idle" ? (
                  <button
                    type="button"
                    onClick={() => handleSetPhase("focus")}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-lg hover:bg-emerald-700"
                  >
                    <Play className="h-4 w-4 fill-current" /> Start Focus
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSetPhase("idle")}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
                    >
                      <Pause className="h-3.5 w-3.5" /> Pause
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleSetPhase(room.phase === "focus" ? "break" : "focus")
                      }
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
                    >
                      <SkipForward className="h-3.5 w-3.5" /> Skip Phase
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* User Goal Bar */}
          <div className="rounded-2xl border border-slate-800 bg-[#18211f] p-4 flex items-center justify-between">
            {editingGoal ? (
              <form onSubmit={handleSaveGoal} className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={newGoalInput}
                  onChange={(e) => setNewGoalInput(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                  placeholder="Update your goal..."
                  autoFocus
                />
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingGoal(false)}
                  className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs text-slate-300"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">My Goal</span>
                  <p className="text-xs font-bold text-emerald-300">{userGoal || "Studying"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewGoalInput(userGoal);
                    setEditingGoal(true);
                  }}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                  title="Edit Goal"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Room Roster */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <span>Room Roster ({roster.length})</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roster.map((m) => (
                <div
                  key={m.user_id}
                  onClick={() => navigate(`/community/u/${m.user_id}`)}
                  className="flex items-center justify-between rounded-2xl border border-slate-800 bg-[#14171c] p-3 cursor-pointer hover:border-emerald-500/50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={m.user_img}
                      name={m.full_name}
                      username={m.username}
                      size="sm"
                      level={m.level}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="truncate text-xs font-bold text-white">
                          {m.full_name || m.username || "Learner"}
                        </p>
                        {m.is_host && (
                          <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" title="Room Host" />
                        )}
                      </div>
                      <p className="truncate text-[11px] text-slate-400">
                        {m.goal || "Studying"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Ephemeral Live Room Chat */}
        <div className="md:col-span-5 lg:col-span-4 border-t md:border-t-0 md:border-l border-slate-800 bg-[#14171c] flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              <span>Room Chat (Ephemeral)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-slate-700"
            >
              <Share2 className="h-3 w-3" /> Share Link
            </button>
          </div>

          <p className="px-4 py-1.5 text-[10px] text-slate-500 italic border-b border-slate-800/60 bg-slate-950/40">
            Room chat disappears when everyone leaves.
          </p>

          {/* Chat Messages List */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            {chatMessages.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-8">
                Say hi to fellow room members!
              </p>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="text-xs">
                  {msg.type === "reaction" ? (
                    <div className="rounded-xl bg-emerald-950/40 p-2 text-[11px] text-emerald-300">
                      <span className="font-bold">{msg.name}</span> reacted {msg.emoji}
                    </div>
                  ) : msg.type === "resource" ? (
                    <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-2.5 text-xs text-emerald-200">
                      <span className="font-bold block text-emerald-400">{msg.name}</span>
                      <a
                        href={sanitizeUrl(msg.link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline break-all text-xs text-sky-400"
                      >
                        {msg.text}
                      </a>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-900 p-2.5 border border-slate-800">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span className="text-emerald-400">{msg.name}</span>
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-slate-200 font-medium leading-relaxed">{msg.text}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Quick Reaction Emoji Bar */}
          <div className="px-4 py-1.5 border-t border-slate-800 flex items-center justify-around bg-slate-950/60 shrink-0">
            {["👍", "👏", "🔥", "🧠", "☕"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSendEmoji(emoji)}
                className="text-base hover:scale-125 transition p-1"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-800 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type message..."
              className="flex-1 rounded-2xl border border-slate-800 bg-slate-900 py-2 px-3 text-xs text-white outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="rounded-2xl bg-emerald-600 p-2 text-white hover:bg-emerald-700 disabled:opacity-40 shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Share Resource Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#14171c] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">Share Resource Link</h3>
              <button type="button" onClick={() => setShowShareModal(false)} className="text-slate-400"><X className="h-5 w-5" /></button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Note: Private file attachments are not visible to non-group members. Share public web links or YouTube videos below.
            </p>

            <form onSubmit={handleShareResource} className="space-y-3">
              <input
                type="url"
                required
                value={resourceLinkInput}
                onChange={(e) => setResourceLinkInput(e.target.value)}
                placeholder="https://youtube.com/..."
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-3 text-xs text-white outline-none focus:border-emerald-500"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowShareModal(false)} className="rounded-2xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300">Cancel</button>
                <button type="submit" className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">Broadcast Link</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Friends Modal */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#14171c] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Invite Friends to Room</h3>
              <button type="button" onClick={() => setShowInviteModal(false)} className="text-slate-400"><X className="h-5 w-5" /></button>
            </div>

            <FriendPicker
              currentUserId={currentUserId}
              onSelectFriend={async (friend) => {
                try {
                  const { data: convId } = await supabase.rpc("get_or_create_direct_conversation", {
                    p_other_user_id: friend.user_id,
                  });
                  if (convId) {
                    await supabase.from("messages").insert({
                      conversation_id: convId,
                      sender_id: currentUserId,
                      content: `Join my virtual study room "${room.name}": ${window.location.origin}/community/rooms/${roomId}`,
                    });
                  }
                  alert(`Invite sent to ${friend.full_name || friend.username}!`);
                  setShowInviteModal(false);
                } catch (err) {
                  console.error("Error sending room invite:", err);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Host Settings Modal */}
      {showHostSettings && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setShowHostSettings(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#14171c] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Host Controls</h3>
              <button type="button" onClick={() => setShowHostSettings(false)} className="text-slate-400"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleUpdateHostSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Room Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Capacity</label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseRoom}
                  className="rounded-2xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700"
                >
                  Close Room
                </button>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowHostSettings(false)} className="rounded-2xl bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-300">Cancel</button>
                  <button type="submit" className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">Save</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
