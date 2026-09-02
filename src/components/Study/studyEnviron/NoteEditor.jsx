import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Pencil, Plus, Trash2, X } from "lucide-react";
import supabase from "../../../lib/supabase";

const NoteEditor = ({ studyId, theme }) => {
  const noteThemes = ["accent-card-chat", "accent-card-plan", "accent-card-read", "accent-card-track"];
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState({ title: "", content: "" });
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!studyId) return;
    setIsLoading(true);
    supabase.from("notes").select("id,session_id,title,content,created_at").eq("session_id", studyId).order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) setError(fetchError.message);
        else setNotes(data || []);
      })
      .finally(() => setIsLoading(false));
  }, [studyId]);

  const saveNote = async (event) => {
    event.preventDefault();
    if (!studyId || !form.title.trim() || !form.content.trim()) return;
    const payload = { title: form.title.trim(), content: form.content.trim(), session_id: studyId };
    const query = editingId
      ? supabase.from("notes").update(payload).eq("id", editingId).select().single()
      : supabase.from("notes").insert(payload).select().single();
    const { data, error } = await query;
    if (error) {
      setError(error.message);
    } else {
      setError("");
      setNotes((current) => editingId ? current.map((note) => note.id === editingId ? data : note) : [data, ...current]);
      setForm({ title: "", content: "" }); setEditingId(null);
    }
  };

  const removeNote = async (id) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) setError(error.message);
    else setNotes((current) => current.filter((note) => note.id !== id));
  };

  return <div className="space-y-5">
    {error && <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"><span>{error}</span><button onClick={() => setError("")}><X className="h-4 w-4" /></button></div>}
    <form onSubmit={saveNote} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Note title" className="w-full rounded-lg border border-slate-200 bg-white p-3 outline-none focus:ring-2" />
      <textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Write a note for this session..." className={`min-h-32 w-full rounded-lg border border-slate-200 bg-white p-4 outline-none focus:ring-2 ${theme.focus}`} />
      <div className="flex justify-end gap-2"><button type="button" onClick={() => { setForm({ title: "", content: "" }); setEditingId(null); }} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-white">Clear</button><button className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${theme.accentButton}`}><Plus className="mr-1 inline h-4 w-4" />{editingId ? "Update note" : "Save note"}</button></div>
    </form>
      {isLoading ? <p className="text-sm text-slate-500">Loading notes...</p> : notes.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center"><FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" /><p className="text-sm text-slate-500">No notes saved for this session.</p></div> : <div className="grid gap-3 sm:grid-cols-2">{notes.map((note, index) => <article key={note.id} className={`relative min-h-36 rounded-lg p-4 ${noteThemes[index % noteThemes.length]}`}><span className="absolute right-3 top-3 text-xs font-bold opacity-60">{String(index + 1).padStart(2, "0")}</span><button type="button" onClick={() => navigate(`/Study/${studyId}/notes/${note.id}`)} className="block max-w-full break-words pr-6 text-left font-bold text-gray-900 hover:underline">{note.title}</button><p className="mt-3 line-clamp-3 text-sm text-gray-800">{note.content}</p><div className="mt-4 flex gap-3 border-t border-black/10 pt-3"><button onClick={() => { setEditingId(note.id); setForm({ title: note.title, content: note.content }); }} className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900"><Pencil className="h-3 w-3" />Edit</button><button onClick={() => removeNote(note.id)} className="inline-flex items-center gap-1 text-sm font-semibold text-red-800"><Trash2 className="h-3 w-3" />Delete</button></div></article>)}</div>}
  </div>;
};

export default NoteEditor;
