import React, { useEffect, useState } from "react";
import { FileText, Pencil, Plus, Trash2, X } from "lucide-react";
import supabase from "../../../lib/supabase";

const NoteEditor = ({ studyId, theme }) => {
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
    {isLoading ? <p className="text-sm text-slate-500">Loading notes...</p> : notes.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center"><FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" /><p className="text-sm text-slate-500">No notes saved for this session.</p></div> : notes.map((note) => <article key={note.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="font-semibold text-slate-900">{note.title}</h3><p className="mt-2 whitespace-pre-wrap text-slate-600">{note.content}</p><div className="mt-4 flex gap-3 border-t border-slate-100 pt-3"><button onClick={() => { setEditingId(note.id); setForm({ title: note.title, content: note.content }); }} className={`inline-flex items-center gap-1 text-sm ${theme.accentText}`}><Pencil className="h-3 w-3" />Edit</button><button onClick={() => removeNote(note.id)} className="inline-flex items-center gap-1 text-sm text-red-600"><Trash2 className="h-3 w-3" />Delete</button></div></article>)}
  </div>;
};

export default NoteEditor;
