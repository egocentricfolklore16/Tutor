import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Clock3, MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react";
import ResponsiveSheet from "../../common/ResponsiveSheet";
import supabase from "../../../lib/supabase";

function relativeTime(value) {
  const timestamp = new Date(value).getTime();
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

function groupName(value) {
  const date = new Date(value);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((startToday - startDate) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff <= 7) return "Previous 7 days";
  return "Older";
}

export default function ChatHistoryDrawer({
  isOpen,
  onClose,
  userId,
  activeConversationId,
  onSelect,
  onArchive,
  refreshVersion,
  onNewChat,
  isInline = false,
}) {
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [subjects, setSubjects] = useState({});
  const [menuId, setMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async (append = false) => {
    if (!userId) return;
    setLoading(true);
    setError("");
    let query = supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", userId)
      .eq("archived", false)
      .order("last_message_at", { ascending: false })
      .range(append ? offset : 0, (append ? offset : 0) + 29);
    if (search.trim()) query = query.ilike("title", `%${search.trim()}%`);
    const { data, error: queryError } = await query;
    setLoading(false);
    if (queryError) {
      setError("Couldn't load chat history. Please try again.");
      return;
    }
    const next = data || [];
    setConversations((previous) => append ? [...previous, ...next] : next);
    setOffset((append ? offset : 0) + next.length);
    setHasMore(next.length === 30);

    const sessionIds = [...new Set(next.map((item) => item.session_id).filter(Boolean))];
    if (sessionIds.length) {
      const { data: studies } = await supabase
        .from("Study")
        .select("id, Subject, Topic")
        .in("id", sessionIds);
      const lookup = {};
      (studies || []).forEach((study) => {
        lookup[study.id] = [study.Subject, study.Topic].filter(Boolean).join(" - ");
      });
      setSubjects((previous) => ({ ...previous, ...lookup }));
    }
  }, [userId, search, offset]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setOffset(0);
      load(false);
    }, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [isOpen, search, refreshVersion]);

  const grouped = useMemo(() => {
    const result = {};
    conversations.forEach((conversation) => {
      const name = groupName(conversation.last_message_at || conversation.updated_at || conversation.created_at);
      (result[name] ||= []).push(conversation);
    });
    return result;
  }, [conversations]);

  const updateTitle = async (conversation) => {
    const title = editTitle.trim().slice(0, 120);
    if (!title) {
      setEditingId(null);
      return;
    }
    const previous = conversations;
    setConversations((items) => items.map((item) => item.id === conversation.id ? { ...item, title } : item));
    setEditingId(null);
    const { error: updateError } = await supabase
      .from("ai_conversations").update({ title, updated_at: new Date().toISOString() }).eq("id", conversation.id);
    if (updateError) {
      setConversations(previous);
      setToast("Couldn't rename this chat.");
    }
  };

  const archive = async (conversation) => {
    setMenuId(null);
    const previous = conversations;
    setConversations((items) => items.filter((item) => item.id !== conversation.id));
    const { error: archiveError } = await supabase
      .from("ai_conversations").update({ archived: true }).eq("id", conversation.id);
    if (archiveError) {
      setConversations(previous);
      setToast("Couldn't archive this chat.");
    } else {
      if (activeConversationId === conversation.id) onNewChat?.();
      onArchive?.(conversation.id);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const previous = conversations;
    setConversations((items) => items.filter((item) => item.id !== deleteId));
    const id = deleteId;
    setDeleteId(null);
    const { error: deleteError } = await supabase.from("ai_conversations").delete().eq("id", id);
    if (deleteError) {
      setConversations(previous);
      setToast("Couldn't delete this chat.");
    } else if (activeConversationId === id) {
      onNewChat?.();
    }
  };

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Chat history"
      isLeftDrawer
      isInline={isInline}
      className="border-r border-slate-200 dark:border-slate-800"
    >
      <div className="flex h-full flex-col">
        <div className="px-1 pb-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        {error && (
          <button type="button" onClick={() => load(false)} className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-left text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </button>
        )}

        <div className="flex-1 space-y-5 overflow-y-auto">
          {loading && conversations.length === 0 && (
            <div className="space-y-2" aria-label="Loading chat history">
              {[0, 1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
            </div>
          )}
          {!loading && conversations.length === 0 && (
            <div className="px-2 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No chats yet. Ask Lumo anything and it will show up here.
            </div>
          )}
          {["Today", "Yesterday", "Previous 7 days", "Older"].map((name) => grouped[name]?.length ? (
            <section key={name}>
              <h3 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{name}</h3>
              <div className="space-y-1">
                {grouped[name].map((conversation) => (
                  <div key={conversation.id} className={`relative rounded-xl border ${activeConversationId === conversation.id ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-900"}`}>
                    {editingId === conversation.id ? (
                      <div className="p-2">
                        <input
                          autoFocus
                          value={editTitle}
                          maxLength={120}
                          onChange={(event) => setEditTitle(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") updateTitle(conversation);
                            if (event.key === "Escape") setEditingId(null);
                          }}
                          aria-label="Conversation title"
                          className="min-h-11 w-full rounded-xl border border-emerald-500 px-3 text-sm dark:bg-slate-900"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelect(conversation.id)}
                        className="w-full px-3 py-2 pr-12 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{conversation.title}</span>
                        <span className="mt-1 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                          <Clock3 className="h-3 w-3" />
                          {relativeTime(conversation.last_message_at || conversation.updated_at || conversation.created_at)}
                          {conversation.session_id && subjects[conversation.session_id] && (
                            <span className="max-w-[140px] truncate rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                              {subjects[conversation.session_id]}
                            </span>
                          )}
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMenuId(menuId === conversation.id ? null : conversation.id)}
                      aria-label={`Actions for ${conversation.title}`}
                      aria-expanded={menuId === conversation.id}
                      className="absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-slate-800"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuId === conversation.id && (
                      <div role="menu" className="absolute right-2 top-10 z-10 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                        <button type="button" role="menuitem" onClick={() => { setEditingId(conversation.id); setEditTitle(conversation.title); setMenuId(null); }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil className="h-4 w-4" />Rename</button>
                        <button type="button" role="menuitem" onClick={() => archive(conversation)} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"><Archive className="h-4 w-4" />Archive</button>
                        <button type="button" role="menuitem" onClick={() => { setDeleteId(conversation.id); setMenuId(null); }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 className="h-4 w-4" />Delete</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ) : null)}
        </div>

        {hasMore && conversations.length > 0 && (
          <button type="button" onClick={() => load(true)} disabled={loading} className="mx-1 mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold dark:border-slate-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Load more
          </button>
        )}
        <p className="mt-3 px-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
          Chats are saved to your account. Only you can see them. Delete any chat anytime.
        </p>
        {toast && <div role="status" className="mt-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-slate-900">{toast}</div>}
      </div>

      <ResponsiveSheet
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Delete chat?"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">This permanently deletes the chat and its messages.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setDeleteId(null)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold dark:border-slate-700">Cancel</button>
          <button type="button" onClick={confirmDelete} className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700">Delete chat</button>
        </div>
      </ResponsiveSheet>
    </ResponsiveSheet>
  );
}
