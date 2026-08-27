import React, { useEffect, useState } from "react";
import { ArrowLeft, Layers3, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import supabase from "../../../lib/supabase";

const Flashcards = ({ studyId, theme }) => {
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({ question: "", answer: "" });
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [flippedCards, setFlippedCards] = useState({});

  useEffect(() => {
    if (!studyId) return;
    setIsLoading(true);
    supabase
      .from("flashcards")
      .select("id,session_id,question,answer,created_at")
      .eq("session_id", studyId)
      .order("created_at")
      .then(({ data, error: fetchError }) => {
        if (fetchError) setError(fetchError.message);
        else setCards(data || []);
      })
      .finally(() => setIsLoading(false));
  }, [studyId]);

  const saveCard = async (event) => {
    event.preventDefault();
    if (!studyId || !form.question.trim() || !form.answer.trim()) return;
    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      session_id: studyId,
    };
    const query = editingId
      ? supabase.from("flashcards").update(payload).eq("id", editingId).select().single()
      : supabase.from("flashcards").insert(payload).select().single();
    const { data, error: saveError } = await query;
    if (saveError) setError(saveError.message);
    else {
      setError("");
      setCards((current) => editingId ? current.map((card) => card.id === editingId ? data : card) : [...current, data]);
      setForm({ question: "", answer: "" });
      setEditingId(null);
    }
  };

  const removeCard = async (id) => {
    const { error: deleteError } = await supabase.from("flashcards").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    else setCards((current) => current.filter((card) => card.id !== id));
  };

  return (
    <div className="space-y-8">
      {error && <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"><span>{error}</span><button onClick={() => setError("")}><X className="h-4 w-4" /></button></div>}
      {isLoading ? <p className="text-sm text-slate-500">Loading flashcards...</p> : cards.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center"><Layers3 className="mx-auto mb-2 h-8 w-8 text-slate-300" /><p className="text-sm text-slate-500">No flashcards saved for this session.</p></div> : (
        <div className="rounded-2xl bg-slate-100 px-4 py-8 ring-1 ring-slate-200 md:px-8">
          <div className="mb-6 flex items-center justify-between text-slate-900"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Study deck</p><h3 className="mt-1 text-xl font-bold">Flip through your cards</h3></div><Layers3 className={`h-6 w-6 ${theme.accent}`} /></div>
          <div className="grid justify-items-center gap-10 sm:grid-cols-2">
            {cards.map((card, index) => {
              const isFlipped = flippedCards[card.id];
              return <div key={card.id} className="w-full max-w-[360px] [perspective:1000px]"><div className={`relative aspect-[5/7] w-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? "[transform:rotateY(180deg)]" : ""}`}>
                <div className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white p-6 text-slate-900 shadow-xl [backface-visibility:hidden]">
                  <div className="flex items-center justify-between"><span className={`rounded-full px-3 py-1 text-xs font-bold ${theme.accentBg} ${theme.accentText}`}>CARD {index + 1}</span><Layers3 className="h-5 w-5 text-slate-300" /></div>
                  <div className="text-center"><p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Question</p><p className="text-xl font-bold leading-relaxed">{card.question}</p></div>
                  <button onClick={() => setFlippedCards((current) => ({ ...current, [card.id]: true }))} className={`mx-auto inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-lg ${theme.accentButton}`}>Show answer <RotateCcw className="h-4 w-4" /></button>
                </div>
                <div className={`absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[1.25rem] border p-6 shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)] ${theme.accentBg} ${theme.divider}`}>
                  <div className="flex items-center justify-between"><span className={`rounded-full px-3 py-1 text-xs font-bold ${theme.pill}`}>ANSWER</span><SparkleMark /></div>
                  <p className={`text-center text-xl font-bold leading-relaxed ${theme.accentText}`}>{card.answer}</p>
                  <button onClick={() => setFlippedCards((current) => ({ ...current, [card.id]: false }))} className={`mx-auto inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-bold ${theme.accentText} ${theme.divider}`}><ArrowLeft className="h-4 w-4" /> Question</button>
                </div>
              </div></div>;
            })}
          </div>
        </div>
      )}
      <form onSubmit={saveCard} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"><div className="flex items-center gap-2"><Plus className={`h-4 w-4 ${theme.accent}`} /><h3 className="font-bold text-slate-900">Add to this deck</h3></div><div className="grid gap-3 md:grid-cols-2"><input value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} placeholder="Question" className="rounded-lg border border-slate-200 bg-white p-3" /><input value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} placeholder="Answer" className="rounded-lg border border-slate-200 bg-white p-3" /></div><div className="flex justify-end gap-2"><button type="button" onClick={() => { setForm({ question: "", answer: "" }); setEditingId(null); }} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-white">Clear</button><button className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${theme.accentButton}`}><Plus className="mr-1 inline h-4 w-4" />{editingId ? "Update card" : "Save card"}</button></div></form>
      {cards.length > 0 && <div className="grid gap-2 md:grid-cols-2">{cards.map((card) => <div key={`edit-${card.id}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><span className="truncate text-slate-600">{card.question}</span><div className="flex gap-2"><button onClick={() => { setEditingId(card.id); setForm({ question: card.question, answer: card.answer }); }} className={`p-1 ${theme.accentText}`} title="Edit card"><Pencil className="h-4 w-4" /></button><button onClick={() => removeCard(card.id)} className="p-1 text-red-600" title="Delete card"><Trash2 className="h-4 w-4" /></button></div></div>)}</div>}
    </div>
  );
};

const SparkleMark = () => <span className="text-lg">✦</span>;

export default Flashcards;
