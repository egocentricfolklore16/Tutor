import React, { useEffect, useState } from "react";
import { ExternalLink, FileUp, Loader2, Trash2 } from "lucide-react";
import supabase from "../../../lib/supabase";

const STORAGE_BUCKET = "resources";

const getSafeFileName = (fileName) => fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

const ResourceAttachments = ({ studyId, userId, theme }) => {
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
      const { data, error: fetchError } = await supabase.from("resources")
        .select("id, session_id, file_name, file_path, file_type, created_at")
        .eq("session_id", studyId).eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (fetchError) setError("Unable to load resources.");
      else setResources(data || []);
      setIsLoading(false);
    };

    fetchResources();

    if (!studyId || !userId) return undefined;

    const channel = supabase
      .channel(`resources-${studyId}-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "resources", filter: `session_id=eq.${studyId}` },
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
    if (!selectedFile || !studyId || !userId) return;
    setIsSaving(true);
    setError("");
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      setError("Unable to upload this resource: your session has expired.");
      setIsSaving(false);
      return;
    }

    const filePath = `${authUser.id}/${studyId}/${crypto.randomUUID()}-${getSafeFileName(selectedFile.name)}`;
    const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, selectedFile);
    if (uploadError) {
      setError(`Unable to upload this resource: ${uploadError.message}`);
      setIsSaving(false);
      return;
    }
    const { data, error: insertError } = await supabase.from("resources").insert({
      session_id: studyId, user_id: authUser.id, file_name: selectedFile.name,
      file_path: filePath, file_type: selectedFile.type || "application/octet-stream",
    }).select("id, session_id, file_name, file_path, file_type, created_at").single();
    if (insertError) {
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
      setError(`The file uploaded, but its resource record could not be saved: ${insertError.message}`);
    } else {
      setResources((current) => [data, ...current]);
      setSelectedFile(null);
      event.target.reset();
    }
    setIsSaving(false);
  };

  const removeResource = async (resource) => {
    setDeletingId(resource.id);
    const { error: deleteError } = await supabase.from("resources").delete()
      .eq("id", resource.id).eq("user_id", userId);
    if (deleteError) setError("Unable to remove this resource.");
    else {
      await supabase.storage.from(STORAGE_BUCKET).remove([resource.file_path]);
      setResources((current) => current.filter((item) => item.id !== resource.id));
    }
    setDeletingId(null);
  };

  const openResource = async (filePath) => {
    const { data, error: urlError } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(filePath, 3600);
    if (urlError) {
      setError("Unable to open this resource.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-5">
      <form onSubmit={saveResource} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center">
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
          <FileUp className="h-5 w-5 shrink-0 text-slate-400" />
          <span className="truncate">{selectedFile?.name || "Choose a file to attach"}</span>
          <input type="file" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} className="sr-only" />
        </label>
        <button type="submit" disabled={!selectedFile || isSaving} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-white disabled:opacity-50 ${theme?.accentButton || "bg-indigo-600"}`}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} Upload
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {isLoading ? <p className="text-sm text-slate-500">Loading resources...</p> : resources.length === 0 ? <p className="text-sm text-slate-500">No resources attached yet.</p> : resources.map((resource) => (
        <article key={resource.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
          <div className="min-w-0"><p className="truncate font-semibold text-slate-800">{resource.file_name}</p><p className="mt-1 text-xs text-slate-400">{resource.file_type}</p></div>
          <div className="flex shrink-0 items-center gap-3">
            <button type="button" onClick={() => openResource(resource.file_path)} title="Open resource" className={`rounded-md p-2 ${theme?.accentText || "text-indigo-600"}`}><ExternalLink className="h-4 w-4" /></button>
            <button type="button" onClick={() => removeResource(resource)} disabled={deletingId === resource.id} title="Delete resource" className="rounded-md p-2 text-red-600 disabled:opacity-50">{deletingId === resource.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
          </div>
        </article>
      ))}
    </div>
  );
};

export default ResourceAttachments;