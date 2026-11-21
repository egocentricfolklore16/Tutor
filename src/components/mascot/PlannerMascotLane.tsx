import React, { useEffect, useMemo, useRef, useState } from "react";
import { useProfile } from "../../app/ProfileContext";
import HyperOwl from "./HyperOwl";
import { useOwlMood } from "./useOwlMood";
import "./mascot.css";
import "./mascot-layout.css";

type Activity = { date?: Date | string; status?: string; completed?: boolean };
type Props = { activities: Activity[]; align?: "right" | "center"; onPlan: () => void };

const STORAGE_KEY = "lumo-planner-last-message";

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

export default function PlannerMascotLane({ activities, align = "right", onPlan }: Props) {
  const { profile } = useProfile();
  const [visible, setVisible] = useState(false);
  const [typed, setTyped] = useState("");
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState("");
  const [pose, setPose] = useState("thinking");
  const timerRef = useRef<number[]>([]);
  const pausedRef = useRef(false);
  const owlMood = useOwlMood(2500);

  useEffect(() => {
    if (owlMood === "happy") setPose("happy");
  }, [owlMood]);

  const todayCount = useMemo(() => {
    const now = new Date();
    return activities.filter((activity) => {
      const raw = activity.date;
      const date = raw instanceof Date ? raw : raw ? new Date(raw) : null;
      return date && sameDay(date, now);
    }).length;
  }, [activities]);

  const completedToday = useMemo(() => {
    const now = new Date();
    return activities.filter((activity) => {
      const raw = activity.date;
      const date = raw instanceof Date ? raw : raw ? new Date(raw) : null;
      return date && sameDay(date, now) && (activity.completed || activity.status === "completed");
    }).length;
  }, [activities]);

  const chooseMessage = () => {
    const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "friend";
    const evening = new Date().getHours() >= 18;
    let pool: string[] = [];
    if (todayCount > 0 && completedToday === todayCount) {
      pool = ["All done for today! Plan tomorrow while it's fresh?", `Nice work, ${firstName}! Tomorrow is ready when you are.`];
    } else if (todayCount > 0) {
      pool = [`You've got ${todayCount} session${todayCount === 1 ? "" : "s"} today. Want to add one more?`, `Hey ${firstName}, one focused session today can make a difference.`];
    } else if (evening) {
      pool = ["A quick 20-minute session tonight keeps your streak alive.", `Hey ${firstName}, a little evening review could feel great.`];
    } else {
      pool = [`Hey ${firstName}, your week is wide open. Let's plan a study session!`, `Ready for a fresh start, ${firstName}? Pick a small goal.`];
    }
    let last = "";
    try { last = sessionStorage.getItem(STORAGE_KEY) || ""; } catch {}
    let next = pool.find((item) => item !== last) || pool[0];
    try { sessionStorage.setItem(STORAGE_KEY, next); } catch {}
    return next;
  };

  const replay = () => {
    timerRef.current.forEach(window.clearTimeout);
    timerRef.current = [];
    const next = chooseMessage();
    setMessage(next);
    setTyped("");
    setFinished(false);
    setVisible(true);
    setPose("happy");
    window.setTimeout(() => setPose("thinking"), 2500);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setTyped(next);
      setFinished(true);
    } else {
      [...next].forEach((_, index) => {
        timerRef.current.push(window.setTimeout(() => setTyped(next.slice(0, index + 1)), 32 * (index + 1)));
      });
      timerRef.current.push(window.setTimeout(() => setFinished(true), 32 * next.length));
    }

    timerRef.current.push(window.setTimeout(() => {
      if (!pausedRef.current) setVisible(false);
    }, 9000 + next.length * 32));
  };

  useEffect(() => {
    const mountTimer = window.setTimeout(replay, 700);
    return () => {
      window.clearTimeout(mountTimer);
      timerRef.current.forEach(window.clearTimeout);
    };
  }, []);

  const pause = () => { pausedRef.current = true; };
  const resume = () => { pausedRef.current = false; };

  return (
    <div className={`planner-mascot-lane align-${align}`} style={{ "--owl-hidden-fraction": "0.42", "--owl-overlap-px": "14px" } as React.CSSProperties}>
      {visible && (
        <div
          className="lumo-thought-bubble"
          onMouseEnter={pause}
          onMouseLeave={resume}
          onFocus={pause}
          onBlur={resume}
        >
          <span className="bubble-trail bubble-trail-a" />
          <span className="bubble-trail bubble-trail-b" />
          <span className="bubble-tail" />
          <span className="sr-only" role="status" aria-live="polite">{message}</span>
          <p aria-hidden="true" className="bubble-text">
            {typed}
            {!finished && <span className="bubble-caret" aria-hidden="true" />}
          </p>
          {finished && (
            <button type="button" onClick={onPlan} className="bubble-plan-button">
              Plan a session
            </button>
          )}
        </div>
      )}
      <HyperOwl poseId={pose} mood={pose === "happy" ? "happy" : "thinking"} onClick={replay} />
      <div className="planner-calendar-ao" />
    </div>
  );
}
