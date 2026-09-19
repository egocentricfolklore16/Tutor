import React, { useEffect, useState } from "react";
import { ExternalLink, FileUp, Loader2, Trash2 } from "lucide-react";
import supabase from "../../../lib/supabase";

const STORAGE_BUCKET = "resources";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/markdown",
  "text/csv",
];

const getSafeFileName = (fileName) => fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

const ResourceAttachments = ({ studyId, userId, theme, onTimelineEvent }) => {
  const [resources, setResources] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
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
        .select("id, session_id, user_id, title, kind, file_path, url, mime_type, source, created_at")
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

  const saveResource = async (event) => {
    event.preventDefault();
    if (!studyId) {
      setError("Active study session required to upload resources.");
      return;
    }
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("File size exceeds 10 MB limit.");
      return;
    }

    if (selectedFile.type && !ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "png", "jpg", "jpeg", "webp", "txt", "md", "csv"].includes(ext || "")) {
        setError("Invalid file type. Allowed: PDF, PNG, JPG, WEBP, TXT, MD, CSV.");
        return;
      }
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
      .select("id, session_id, user_id, title, kind, file_path, url, mime_type, source, created_at")
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

  return (
    <div className="space-y-5">
      <form onSubmit={saveResource} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center">
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
          <FileUp className="h-5 w-5 shrink-0 text-slate-400" />
          <span className="truncate">{selectedFile?.name || "Choose a file to attach (PDF, images, txt, md, csv - max 10MB)"}</span>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.csv"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            className="sr-only"
            disabled={!studyId}
          />
        </label>
        <button
          type="submit"
          disabled={!selectedFile || isSaving || !studyId}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-white disabled:opacity-50 ${theme?.accentButton || "bg-indigo-600"}`}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} Upload
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading resources...</p>
      ) : resources.length === 0 ? (
        <p className="text-sm text-slate-500">No resources attached yet.</p>
      ) : (
        resources.map((resource) => (
          <article key={resource.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-800">{resource.title}</p>
              <p className="mt-1 text-xs text-slate-400">{resource.mime_type || resource.kind}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => openResource(resource)}
                title="Open resource"
                className={`rounded-md p-2 ${theme?.accentText || "text-indigo-600"}`}
              >
                <ExternalLink className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => removeResource(resource)}
                disabled={deletingId === resource.id}
                title="Delete resource"
                className="rounded-md p-2 text-red-600 disabled:opacity-50"
              >
                {deletingId === resource.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
};

export default ResourceAttachments;
