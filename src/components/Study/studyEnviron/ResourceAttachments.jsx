import React, { useEffect, useState } from "react";
import { ExternalLink, FileUp, Link2, Loader2, Plus, Trash2, Youtube, FileText } from "lucide-react";
import supabase from "../../../lib/supabase";

const STORAGE_BUCKET = "resources";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/markdown",
  "text/csv",
];

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp", "txt", "md", "csv"];

const getSafeFileName = (fileName) => fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

const ResourceAttachments = ({ studyId, userId, theme, onTimelineEvent }) => {
  const [resources, setResources] = useState([]);
  const [mode, setMode] = useState("file"); // "file" | "link"
  const [selectedFile, setSelectedFile] = useState(null);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkKind, setLinkKind] = useState("link"); // "link" | "youtube" | "document"

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResources = async () => {
      if (!studyId || !userId) return;
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from("session_resources")
        .select("id, session_id, user_id, title, kind, file_path, url, mime_type, extraction_status, source, created_at")
        .eq("session_id", studyId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (fetchError) setError("Unable to load resources.");
      else setResources(data || []);
      setIsLoading(false);
    };

    fetchResources();

    if (!studyId || !userId) return undefined;

    const channel = supabase
      .channel(`session_resources-${studyId}-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_resources", filter: `session_id=eq.${studyId}` },
        fetchResources
      )
      .subscribe();

    window.addEventListener("focus", fetchResources);

    return () => {
      window.removeEventListener("focus", fetchResources);
      supabase.removeChannel(channel);
    };
  }, [studyId, userId]);

  const saveFileUpload = async (event) => {
    event.preventDefault();
    if (!studyId) {
      setError("Active study session required to upload resources.");
      return;
    }
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("File size exceeds the 10 MB limit.");
      return;
    }

    const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "";
    const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
    const isAllowedMime = selectedFile.type ? ALLOWED_MIME_TYPES.includes(selectedFile.type) : false;

    if (!isAllowedExt && !isAllowedMime) {
      setError("Unsupported file type. Allowed formats: PDF, Word (.doc, .docx), PNG, JPG, WEBP, TXT, MD, CSV (max 10 MB).");
      return;
    }

    setIsSaving(true);
    setError("");

    let activeUserId = userId;
    if (!activeUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      activeUserId = user?.id;
    }

    if (!activeUserId) {
      setError("Unable to upload resource: user session invalid.");
      setIsSaving(false);
      return;
    }

    const filePath = `${activeUserId}/${studyId}/${crypto.randomUUID()}-${getSafeFileName(selectedFile.name)}`;
    const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, selectedFile);

    if (uploadError) {
      setError(`Unable to upload resource: ${uploadError.message}`);
      setIsSaving(false);
      return;
    }

    const mimeType = selectedFile.type || "application/octet-stream";
    const { data, error: insertError } = await supabase
      .from("session_resources")
      .insert({
        session_id: studyId,
        user_id: activeUserId,
        title: selectedFile.name,
        kind: "file",
        file_path: filePath,
        url: null,
        mime_type: mimeType,
        source: "user",
      })
      .select("id, session_id, user_id, title, kind, file_path, url, mime_type, extraction_status, source, created_at")
      .single();

    if (insertError) {
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
      setError(`File uploaded, but resource record failed to save: ${insertError.message}`);
    } else {
      if (onTimelineEvent && data) {
        onTimelineEvent({
          id: crypto.randomUUID(),
          type: "resource",
          refId: String(data.id),
          title: data.title || "Resource attached",
          timestamp: new Date().toISOString(),
        });
      }
      setResources((current) => [data, ...current]);
      setSelectedFile(null);
      event.target.reset();
    }
    setIsSaving(false);
  };

  const saveLinkResource = async (event) => {
    event.preventDefault();
    if (!studyId) {
      setError("Active study session required to attach links.");
      return;
    }
    if (!linkTitle.trim() || !linkUrl.trim()) {
      setError("Please provide a title and URL for the link.");
      return;
    }

    setIsSaving(true);
    setError("");

    let activeUserId = userId;
    if (!activeUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      activeUserId = user?.id;
    }

    if (!activeUserId) {
      setError("User session invalid.");
      setIsSaving(false);
      return;
    }

    let detectedKind = linkKind;
    if (linkUrl.includes("youtube.com") || linkUrl.includes("youtu.be")) {
      detectedKind = "youtube";
    }

    const { data, error: insertError } = await supabase
      .from("session_resources")
      .insert({
        session_id: studyId,
        user_id: activeUserId,
        title: linkTitle.trim(),
        kind: detectedKind,
        file_path: null,
        url: linkUrl.trim(),
        mime_type: null,
        source: "user",
      })
      .select("id, session_id, user_id, title, kind, file_path, url, mime_type, extraction_status, source, created_at")
      .single();

    if (insertError) {
      setError(`Failed to save link: ${insertError.message}`);
    } else {
      if (onTimelineEvent && data) {
        onTimelineEvent({
          id: crypto.randomUUID(),
          type: "resource",
          refId: String(data.id),
          title: data.title || "Link attached",
          timestamp: new Date().toISOString(),
        });
      }
      setResources((current) => [data, ...current]);
      setLinkTitle("");
      setLinkUrl("");
    }
    setIsSaving(false);
  };

  const removeResource = async (resource) => {
    setDeletingId(resource.id);
    const { error: deleteError } = await supabase
      .from("session_resources")
      .delete()
      .eq("id", resource.id)
      .eq("user_id", userId);

    if (deleteError) {
      setError("Unable to remove this resource.");
    } else {
      if (resource.file_path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([resource.file_path]);
      }
      setResources((current) => current.filter((item) => item.id !== resource.id));
    }
    setDeletingId(null);
  };

  const openResource = async (resource) => {
    if (resource.kind === "file" && resource.file_path) {
      const { data, error: urlError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(resource.file_path, 3600);

      if (urlError || !data?.signedUrl) {
        setError("Unable to open this resource: failed to generate signed access URL.");
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } else if (resource.url) {
      window.open(resource.url, "_blank", "noopener,noreferrer");
    }
  };

  const renderExtractionBadge = (status) => {
    if (!status) return null;
    const badgeStyles = {
      pending: "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      done: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      failed: "bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      unsupported: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    }[status] || "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";

    return (
      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeStyles}`}>
        {status}
      </span>
    );
  };

  const renderKindIcon = (resource) => {
    const kind = resource.kind;
    const ext = resource.title?.split(".").pop()?.toLowerCase();
    const mime = resource.mime_type;

    if (kind === "youtube") return <Youtube className="h-4 w-4 text-red-600 dark:text-red-400" />;
    if (kind === "document") return <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    if (kind === "link") return <Link2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
    if (
      ext === "doc" ||
      ext === "docx" ||
      mime === "application/msword" ||
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return <FileText className="h-4 w-4 text-blue-700 dark:text-blue-400" />;
    }
    return <FileUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
  };

  const getResourceLabel = (resource) => {
    const ext = resource.title?.split(".").pop()?.toLowerCase();
    const mime = resource.mime_type;
    if (ext === "docx" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return "Word Document (.docx)";
    }
    if (ext === "doc" || mime === "application/msword") {
      return "Word Document (.doc)";
    }
    return resource.mime_type || resource.kind;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
            mode === "file" ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setMode("link")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
            mode === "link" ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Add Link / URL
        </button>
      </div>

      {mode === "file" ? (
        <form onSubmit={saveFileUpload} className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 md:flex-row md:items-center">
          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-slate-500 dark:text-slate-400">
            <FileUp className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
            <span className="truncate">{selectedFile?.name || "Choose a file to attach (PDF, Word .doc/.docx, images, txt, md, csv - max 10MB)"}</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt,.md,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              className="sr-only"
              disabled={!studyId}
            />
          </label>
          <button
            type="submit"
            disabled={!selectedFile || isSaving || !studyId}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-white font-semibold text-xs disabled:opacity-50 ${theme?.accentButton || "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"}`}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} Upload File
          </button>
        </form>
      ) : (
        <form onSubmit={saveLinkResource} className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              type="text"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="Resource Title (e.g. Lecture Video)"
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2.5 text-xs outline-none sm:col-span-1"
              required
              disabled={!studyId}
            />
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2.5 text-xs outline-none sm:col-span-2"
              required
              disabled={!studyId}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <select
              value={linkKind}
              onChange={(e) => setLinkKind(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
              disabled={!studyId}
            >
              <option value="link">Web Link</option>
              <option value="youtube">YouTube Video</option>
              <option value="document">Online Document</option>
            </select>
            <button
              type="submit"
              disabled={!linkTitle.trim() || !linkUrl.trim() || isSaving || !studyId}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-white font-semibold text-xs disabled:opacity-50 ${theme?.accentButton || "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"}`}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Attach Link
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading resources...</p>
      ) : resources.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No resources attached yet.</p>
      ) : (
        <div className="space-y-3">
          {resources.map((resource) => (
            <article key={resource.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <div className="min-w-0 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shrink-0">
                  {renderKindIcon(resource)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="truncate font-semibold text-slate-800 dark:text-slate-100 text-sm">{resource.title}</p>
                    {renderExtractionBadge(resource.extraction_status)}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 capitalize">{getResourceLabel(resource)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => openResource(resource)}
                  title="Open resource"
                  className={`rounded-md p-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition ${theme?.accentText || "text-indigo-600 dark:text-indigo-400"}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeResource(resource)}
                  disabled={deletingId === resource.id}
                  title="Delete resource"
                  className="rounded-md p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition disabled:opacity-50"
                >
                  {deletingId === resource.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResourceAttachments;
