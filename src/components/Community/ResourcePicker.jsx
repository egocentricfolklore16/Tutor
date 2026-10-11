import React, { useState, useEffect } from "react";
import { Search, Paperclip, FileText, Link, Video, Image, Code, Loader2, X } from "lucide-react";
import supabase from "../../lib/supabase";
import ResponsiveSheet from "../common/ResponsiveSheet";

export function getResourceIcon(kind) {
  const k = (kind || "").toLowerCase();
  if (k.includes("pdf") || k.includes("doc") || k.includes("text") || k.includes("file")) {
    return <FileText className="h-5 w-5 text-sky-600 dark:text-sky-400" />;
  }
  if (k.includes("youtube") || k.includes("video")) {
    return <Video className="h-5 w-5 text-rose-600 dark:text-rose-400" />;
  }
  if (k.includes("image") || k.includes("png") || k.includes("jpg")) {
    return <Image className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
  }
  if (k.includes("code")) {
    return <Code className="h-5 w-5 text-violet-600 dark:text-violet-400" />;
  }
  return <Link className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
}

export default function ResourcePicker({ isOpen, onClose, onSelectResource, currentUserId }) {
  const [resources, setResources] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    const fetchUserResources = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("session_resources")
          .select("*")
          .eq("user_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(40);

        if (error) throw error;
        setResources(data || []);
      } catch (err) {
        console.error("Error fetching user resources:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserResources();
  }, [isOpen, currentUserId]);

  const filteredResources = resources.filter((r) =>
    (r.title || r.file_name || "Resource")
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Share a Resource"
      className="max-w-md"
    >
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search my resources..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
          />
        </div>

        {/* List Body */}
        {loading ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center py-6">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
            <p className="mt-2 text-xs text-slate-500">Loading your saved study resources...</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-[#18211f]">
            <Paperclip className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
            <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              No matching resources found
            </p>
            <p className="text-[11px] text-slate-500">
              Upload resources in your study sessions or library to share them in chat!
            </p>
          </div>
        ) : (
          <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
            {filteredResources.map((res) => {
              const displayTitle = res.title || res.file_name || "Study Resource";
              const kind = res.kind || res.file_type || "resource";

              return (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => {
                    onSelectResource(res);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-left transition hover:border-emerald-500 hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-[#18211f] dark:hover:border-emerald-600 dark:hover:bg-emerald-950/20"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-xs dark:bg-slate-900">
                    {getResourceIcon(kind)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                      {displayTitle}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      {kind}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </ResponsiveSheet>
  );
}
