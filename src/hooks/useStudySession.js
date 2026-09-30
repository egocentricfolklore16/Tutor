import { useState, useEffect, useRef, useCallback } from "react";
import {
  pauseSession,
  pauseSessionBeacon,
  resumeSession,
  heartbeatSession,
  completeSession,
  deleteSession,
} from "../lib/sessionService";

export const useStudySession = ({ session, userId, sendTutorEvent }) => {
  const durationHours = session?.Duration || session?.hours || 0;
  const durationSeconds = Math.max(1, Number.parseFloat(durationHours) * 60 * 60);

  const initialTimeLeft =
    session?.time_left !== undefined && session?.time_left !== null && Number(session.time_left) >= 0
      ? Number(session.time_left)
      : durationSeconds;

  const initialElapsed =
    session?.elapsed_seconds !== undefined && session?.elapsed_seconds !== null
      ? Number(session.elapsed_seconds)
      : Math.max(0, durationSeconds - initialTimeLeft);

  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsed);
  const [isStudying, setIsStudying] = useState(true);
  const [isGoalReached, setIsGoalReached] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);

  const timeLeftRef = useRef(timeLeft);
  const elapsedRef = useRef(elapsedSeconds);
  const isStudyingRef = useRef(isStudying);
  const sessionIdRef = useRef(session?.id);
  const isFinishedRef = useRef(false);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
    elapsedRef.current = elapsedSeconds;
    isStudyingRef.current = isStudying;
    sessionIdRef.current = session?.id;
  }, [timeLeft, elapsedSeconds, isStudying, session?.id]);

  // Sync initial state when session prop changes
  useEffect(() => {
    if (!session?.id) return;
    const nextTime =
      session.time_left !== undefined && session.time_left !== null && Number(session.time_left) >= 0
        ? Number(session.time_left)
        : durationSeconds;

    const nextElapsed =
      session.elapsed_seconds !== undefined && session.elapsed_seconds !== null
        ? Number(session.elapsed_seconds)
        : Math.max(0, durationSeconds - nextTime);

    setTimeLeft(nextTime);
    setElapsedSeconds(nextElapsed);
    setIsGoalReached(false);
    setIsCompleted(false);
    isFinishedRef.current = false;
  }, [session?.id, durationSeconds, session?.time_left, session?.elapsed_seconds]);

  // Resume session on mount & send heartbeat
  useEffect(() => {
    if (!session?.id) return;

    let mounted = true;
    resumeSession({ id: session.id }).then(({ error }) => {
      if (error && mounted) {
        console.warn("Could not set session active on mount:", error);
      }
    });

    const heartbeatInterval = setInterval(() => {
      if (sessionIdRef.current && isStudyingRef.current && !isFinishedRef.current) {
        heartbeatSession({ id: sessionIdRef.current });
      }
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(heartbeatInterval);
      if (sessionIdRef.current && !isFinishedRef.current) {
        pauseSessionBeacon({
          id: sessionIdRef.current,
          time_left: timeLeftRef.current,
          elapsed_seconds: elapsedRef.current,
        });
      }
    };
  }, [session?.id]);

  // Save paused state on visibility or tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionIdRef.current && !isFinishedRef.current) {
        pauseSessionBeacon({
          id: sessionIdRef.current,
          time_left: timeLeftRef.current,
          elapsed_seconds: elapsedRef.current,
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && sessionIdRef.current && !isFinishedRef.current) {
        pauseSession({
          id: sessionIdRef.current,
          time_left: timeLeftRef.current,
          elapsed_seconds: elapsedRef.current,
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Timer interval
  useEffect(() => {
    if (!isStudying || isFinishedRef.current) return undefined;

    const timer = window.setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          setIsStudying(false);
          setIsGoalReached(true);
          if (sendTutorEvent) sendTutorEvent("timer_ended");
          return 0;
        }
        return prevTime - 1;
      });

      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isStudying, sendTutorEvent]);

  // Explicit completion action
  const finishSession = useCallback(
    async (timeline = []) => {
      if (!session?.id || isFinishedRef.current) return;
      setIsCompleting(true);
      setCompletionError("");

      const { data, error } = await completeSession({
        id: session.id,
        userId,
        durationSeconds,
        timeline,
        xp: 50,
        gems: 5,
      });

      setIsCompleting(false);

      if (error) {
        setCompletionError("Failed to save session completion. Please try again.");
      } else {
        isFinishedRef.current = true;
        setIsCompleted(true);
      }

      return { data, error };
    },
    [session?.id, userId, durationSeconds]
  );

  // Explicit delete action
  const deleteSessionCurrent = useCallback(async () => {
    if (!session?.id) return;
    isFinishedRef.current = true;
    return await deleteSession({ id: session.id });
  }, [session?.id]);

  // Pause session action
  const pause = useCallback(async () => {
    setIsStudying(false);
    if (session?.id && !isFinishedRef.current) {
      await pauseSession({
        id: session.id,
        time_left: timeLeftRef.current,
        elapsed_seconds: elapsedRef.current,
      });
    }
  }, [session?.id]);

  // Resume timer action
  const resume = useCallback(async () => {
    setIsStudying(true);
    if (session?.id && !isFinishedRef.current) {
      await resumeSession({ id: session.id });
    }
  }, [session?.id]);

  return {
    timeLeft,
    setTimeLeft,
    elapsedSeconds,
    isStudying,
    setIsStudying,
    isGoalReached,
    setIsGoalReached,
    isCompleting,
    completionError,
    isCompleted,
    durationSeconds,
    pause,
    resume,
    finishSession,
    deleteSessionCurrent,
  };
};
