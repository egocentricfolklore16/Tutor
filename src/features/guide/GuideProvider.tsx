import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useProfile } from "../../app/ProfileContext";
import supabase from "../../lib/supabase";
import { grandTour, taskFlows, type GuideFlow } from "./guideConfig";

export type GuideState = {
  tourCompleted: boolean;
  tourSkippedAt: string | null;
  tasksCompleted: string[];
  nudgesDisabled: boolean;
  lastNudgeAt: string | null;
  currentStep: number;
};

type GuideContextValue = {
  active: boolean;
  flow: GuideFlow | null;
  stepIndex: number;
  welcomeOpen: boolean;
  nudgesDisabled: boolean;
  taskCompleted: (id: string) => boolean;
  openMenu: boolean;
  setOpenMenu: (open: boolean) => void;
  firstName: string;
  startTour: () => void;
  startTask: (id: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  skip: () => void;
  closeWelcome: (later?: boolean) => void;
  setNudgesDisabled: (disabled: boolean) => void;
  resetOnboarding: () => void;
};

export const GuideContext = createContext<GuideContextValue | null>(null);

const LOCAL_KEY = "hyper-tutor-guide-onboarding";
const defaults: GuideState = {
  tourCompleted: false,
  tourSkippedAt: null,
  tasksCompleted: [],
  nudgesDisabled: false,
  lastNudgeAt: null,
  currentStep: 0,
};

function readLocal(userId?: string): GuideState {
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY}:${userId || "anonymous"}`);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const userId = profile?.user_id;
  const [state, setState] = useState<GuideState>(() => readLocal(profile?.user_id));
  const [active, setActive] = useState(false);
  const [flow, setFlow] = useState<GuideFlow | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const firstName = String(profile?.full_name || profile?.username || "Learner").trim().split(/\s+/)[0] || "Learner";

  useEffect(() => {
    const local = readLocal(userId);
    const server = profile?.onboarding && typeof profile.onboarding === "object" ? profile.onboarding : null;
    setState(server ? { ...defaults, ...server, ...local } : local);
  }, [userId, profile?.onboarding]);

  const persist = useCallback((next: GuideState) => {
    setState(next);
    try {
      localStorage.setItem(`${LOCAL_KEY}:${userId || "anonymous"}`, JSON.stringify(next));
    } catch {}
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      if (!userId) return;
      supabase.from("profiles").update({ onboarding: next }).eq("user_id", userId).then(() => undefined);
    }, 500);
  }, [userId]);

  useEffect(() => () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
  }, []);

  useEffect(() => {
    if (!userId || welcomeOpen || active) return;
    const onDashboard = location.pathname === "/" || location.pathname.toLowerCase().startsWith("/dashboard");
    const isMobile = window.matchMedia("(max-width: 639px)").matches;
    if (!onDashboard || isMobile) return;
    if (state.tourCompleted || state.tourSkippedAt) return;
    const timer = window.setTimeout(() => setWelcomeOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, [userId, location.pathname, state.tourCompleted, state.tourSkippedAt, welcomeOpen, active]);

  const startTour = useCallback(() => {
    setWelcomeOpen(false);
    setOpenMenu(false);
    setStepIndex(0);
    setFlow(grandTour);
    persist({ ...state, currentStep: 0 });
    setActive(true);
  }, [persist, state]);

  const startTask = useCallback((id: string) => {
    const task = taskFlows.find((item) => item.id === id);
    if (!task) return;
    setWelcomeOpen(false);
    setOpenMenu(false);
    setStepIndex(0);
    setFlow(task);
    persist({ ...state, currentStep: 0 });
    setActive(true);
  }, [persist, state]);

  const finish = useCallback((skipped = false) => {
    const isTour = flow?.id === "grand-tour";
    if (!isTour && flow) {
      window.dispatchEvent(new CustomEvent("owl:happy", { detail: { source: "lumo-guide", taskId: flow.id } }));
    }
    const next = isTour
      ? { ...state, tourCompleted: !skipped, tourSkippedAt: skipped ? new Date().toISOString() : state.tourSkippedAt, currentStep: 0 }
      : { ...state, tasksCompleted: Array.from(new Set([...state.tasksCompleted, ...(flow?.id ? [flow.id] : [])])), currentStep: 0 };
    persist(next);
    setActive(false);
    setFlow(null);
  }, [flow, persist, state]);

  const nextStep = useCallback(() => {
    if (!flow) return;
    if (stepIndex >= flow.steps.length - 1) {
      finish(false);
      return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    persist({ ...state, currentStep: nextIndex });
  }, [finish, flow, persist, state, stepIndex]);

  const previousStep = useCallback(() => {
    if (!flow || stepIndex === 0) return;
    const nextIndex = stepIndex - 1;
    setStepIndex(nextIndex);
    persist({ ...state, currentStep: nextIndex });
  }, [flow, persist, state, stepIndex]);

  const skip = useCallback(() => finish(true), [finish]);

  const closeWelcome = useCallback((later = true) => {
    setWelcomeOpen(false);
    if (later) persist({ ...state, tourSkippedAt: new Date().toISOString() });
  }, [persist, state]);

  const setNudgesDisabled = useCallback((disabled: boolean) => {
    persist({ ...state, nudgesDisabled: disabled });
  }, [persist, state]);

  const resetOnboarding = useCallback(() => {
    persist({ ...defaults });
  }, [persist]);

  useEffect(() => {
    if (!active || !flow) return;
    const step = flow.steps[stepIndex];
    if (step?.route) navigate(step.route);
  }, [active, flow, stepIndex, navigate]);

  const value = useMemo<GuideContextValue>(() => ({
    active,
    flow,
    stepIndex,
    welcomeOpen,
    nudgesDisabled: state.nudgesDisabled,
    taskCompleted: (id: string) => state.tasksCompleted.includes(id),
    openMenu,
    setOpenMenu,
    firstName,
    startTour,
    startTask,
    nextStep,
    previousStep,
    skip,
    closeWelcome,
    setNudgesDisabled,
    resetOnboarding,
  }), [active, flow, stepIndex, welcomeOpen, state.nudgesDisabled, state.tasksCompleted, openMenu, firstName, startTour, startTask, nextStep, previousStep, skip, closeWelcome, setNudgesDisabled, resetOnboarding]);

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}
