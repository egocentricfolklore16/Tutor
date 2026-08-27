import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import supabase from "../../lib/supabase";

const dateKey = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const AnalyticsDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const loadSessions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("unauthenticated"); return; }
      const { data, error } = await supabase.from("Study").select("id,Subject,Date,Duration,Status").eq("user_id", user.id);
      if (error) { setStatus("error"); console.error("Analytics fetch error:", error); return; }
      setSessions(data || []);
      setStatus("ready");
    };
    loadSessions();
  }, []);

  const analytics = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const chart = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return { key: dateKey(date), day: date.toLocaleDateString("en-US", { weekday: "short" }), hours: 0 };
    });
    sessions.forEach((session) => {
      const day = chart.find((item) => item.key === dateKey(session.Date));
      if (day) day.hours += Number.parseFloat(session.Duration) || 0;
    });
    const subjectTotals = sessions.reduce((result, session) => {
      const subject = session.Subject || "Uncategorised";
      result[subject] = (result[subject] || 0) + (Number.parseFloat(session.Duration) || 0);
      return result;
    }, {});
    const subjects = Object.entries(subjectTotals).map(([name, hours]) => ({ name, hours })).sort((a, b) => b.hours - a.hours).slice(0, 5);
    const plannedHours = sessions.reduce((total, session) => total + (Number.parseFloat(session.Duration) || 0), 0);
    const pastSessions = sessions.filter((session) => new Date(session.Date) <= today).length;
    return { chart, subjects, plannedHours, pastSessions, weekHours: chart.reduce((total, item) => total + item.hours, 0) };
  }, [sessions]);

  if (status === "loading") return <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">Loading your analytics...</div>;
  if (status === "unauthenticated") return <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">Sign in to view your analytics.</div>;
  if (status === "error") return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">Unable to load your study analytics.</div>;

  return <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:p-5">
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-lg border border-gray-200 p-5"><div className="mb-6 flex items-start justify-between"><div><h2 className="text-xl font-semibold text-gray-900">Weekly Progress</h2><p className="mt-1 text-sm text-gray-500">Planned study time over the last 7 days</p></div><span className="text-sm font-semibold text-gray-600">{analytics.weekHours.toFixed(1)} hrs</span></div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics.chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="day" stroke="#6b7280" fontSize={12} /><YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} /><Tooltip formatter={(value) => [`${value} hrs`, "Study time"]} /><Area type="monotone" dataKey="hours" stroke="#ef4444" strokeWidth={2} fill="#fee2e2" /></AreaChart></ResponsiveContainer></div></div>
      <div className="rounded-lg border border-gray-200 p-5"><h2 className="mb-4 text-lg font-semibold text-gray-900">Time by subject</h2>{analytics.subjects.length === 0 ? <p className="text-sm text-gray-500">Create a session to see subject trends.</p> : <div className="space-y-4">{analytics.subjects.map((subject, index) => { const percentage = analytics.plannedHours ? Math.round(subject.hours / analytics.plannedHours * 100) : 0; return <div key={subject.name}><div className="mb-1 flex justify-between text-sm"><span className="font-medium text-gray-700">{subject.name}</span><span className="text-gray-500">{subject.hours.toFixed(1)}h</span></div><div className="h-2 rounded-full bg-gray-100"><div className={`h-2 rounded-full ${index === 0 ? "bg-red-400" : index === 1 ? "bg-orange-400" : "bg-green-400"}`} style={{ width: `${percentage}%` }} /></div></div>; })}</div>}</div>
    </div>
    <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">{[[sessions.length, "Sessions", "total"], [`${analytics.plannedHours.toFixed(1)}h`, "Planned time", "all"], [analytics.pastSessions, "Past sessions", "count"], [analytics.weekHours.toFixed(1), "This week", "hours"]].map(([value, label, suffix]) => <div key={label} className="rounded-lg border border-gray-200 p-4 text-center"><div className="text-2xl font-bold text-gray-900">{value}</div><div className="text-sm text-gray-600">{label}</div><div className="mt-1 text-xs uppercase text-gray-400">{suffix}</div></div>)}</div>
  </div>;
};

export default AnalyticsDashboard;
