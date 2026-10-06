import { ArrowRight, Brain, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../lib/supabase";
import LoadingCompanion from "../common/LoadingCompanion";

function WeakAreaCard() {
  const navigate = useNavigate();
  const [weakArea, setWeakArea] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;

    const loadWeakArea = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) setStatus("empty");
        return;
      }

      const { data, error } = await supabase
        .from("study_session_logs")
        .select("id, session_id, concept, question, created_at")
        .eq("user_id", user.id)
        .eq("is_correct", false)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Weak-area fetch error:", error);
        if (active) setStatus("empty");
        return;
      }

      const areas = new Map();
      (data || []).forEach((log) => {
        const concept = String(log.concept || "").trim();
        if (!concept || !log.question) return;

        const current = areas.get(concept) || {
          concept,
          originalQuestion: log.question,
          timesFailedOrHesitated: 0,
          lastAttemptedAt: log.created_at,
          sessionId: log.session_id,
        };
        current.timesFailedOrHesitated += 1;
        areas.set(concept, current);
      });

      const latest = [...areas.values()].sort(
        (left, right) => new Date(right.lastAttemptedAt) - new Date(left.lastAttemptedAt),
      )[0] || null;

      if (active) {
        setWeakArea(latest);
        setStatus(latest ? "ready" : "empty");
      }
    };

    loadWeakArea();
    return () => { active = false; };
  }, []);

  if (status === "loading") return <section className="rounded-lg border border-slate-200 bg-white" aria-busy="true"><LoadingCompanion message="Checking your focus areas..." /></section>;

  if (!weakArea) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6" aria-labelledby="still-shaky-title">
        <div className="flex items-center gap-2 text-slate-500">
          <Brain className="h-5 w-5" />
          <h2 id="still-shaky-title" className="text-xl font-bold text-slate-900">Still shaky on this</h2>
        </div>
        <p className="mt-3 text-sm text-slate-600">No concepts need extra attention yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border-2 border-red-200 bg-red-50 p-5 shadow-sm lg:p-6" aria-labelledby="still-shaky-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-700"><Brain className="h-4 w-4" /> Focus check-in</p>
          <h2 id="still-shaky-title" className="text-2xl font-bold text-slate-950">Still shaky on this</h2>
          <p className="mt-1 text-sm font-semibold text-red-800">{weakArea.concept}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700">{weakArea.timesFailedOrHesitated} missed</span>
      </div>
      <blockquote className="mt-5 border-l-4 border-red-300 bg-white p-4 text-base font-medium leading-7 text-slate-800">“{weakArea.originalQuestion}”</blockquote>
      <p className="mt-3 text-xs text-red-800">Last attempted {new Date(weakArea.lastAttemptedAt).toLocaleDateString()}</p>
      <button onClick={() => navigate(`/Study/${weakArea.sessionId}`)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700">
        Try Again <ArrowRight className="h-4 w-4" />
      </button>
    </section>
  );
}

export default WeakAreaCard;