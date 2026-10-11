import React, { useState, useEffect } from "react";
import { ExternalLink, Download, Loader2 } from "lucide-react";
import supabase from "../../lib/supabase";
import { getResourceIcon } from "./ResourcePicker";
import { getResourceSignedUrl } from "../../lib/communityChat";

export default function ResourceCard({ resourceId }) {
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!resourceId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchResource = async () => {
      try {
        const { data, error } = await supabase
          .from("session_resources")
          .select("*")
          .eq("id", resourceId)
          .maybeSingle();

        if (error) throw error;
        if (isMounted) setResource(data);
      } catch (err) {
        console.error("Error fetching shared resource card:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchResource();
    return () => {
      isMounted = false;
    };
  }, [resourceId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/80">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
        <span className="text-slate-500">Loading resource...</span>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/80">
        Shared resource unavailable.
      </div>
    );
  }

  const displayTitle = resource.title || resource.file_name || "Attachment";
  const kind = resource.kind || resource.file_type || "resource";

  const handleOpenResource = async () => {
    setOpening(true);
    try {
      if (resource.file_path) {
        const signedUrl = await getResourceSignedUrl(supabase, resource.file_path);
        if (signedUrl) {
          window.open(signedUrl, "_blank", "noopener,noreferrer");
        } else if (resource.url) {
          window.open(resource.url, "_blank", "noopener,noreferrer");
        }
      } else if (resource.url) {
        window.open(resource.url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Failed to open resource:", err);
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="mt-1 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-700/80 dark:bg-slate-900/90 max-w-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
          {getResourceIcon(kind)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
            {displayTitle}
          </p>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
            {kind}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={opening}
        onClick={handleOpenResource}
        className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {opening ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : resource.file_path ? (
          <Download className="h-3 w-3" />
        ) : (
          <ExternalLink className="h-3 w-3" />
        )}
        <span>Open</span>
      </button>
    </div>
  );
}
