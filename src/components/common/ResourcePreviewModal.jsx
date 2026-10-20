import { useEffect, useState } from "react";
import { BookOpen, Download, ExternalLink, FileText, FileUp, Link2, Loader2, Youtube } from "lucide-react";
import supabase from "../../lib/supabase";
import { sanitizeUrl } from "../../lib/communityChat";
import ResponsiveSheet from "./ResponsiveSheet";

const STORAGE_BUCKET = "resources";

function cleanPreviewText(value) {
  if (typeof value !== "string") return "";

  const boilerplate = /^(home|menu|navigation|main menu|skip to content|skip navigation|search|log ?in|sign ?in|sign ?up|register|subscribe|account|accessibility|share|cookie settings|privacy policy|terms of (use|service)|contact us|about us|related (articles|content)|previous|next)$/i;
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line && !boilerplate.test(line))
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getResourceType(resource) {
  const mime = String(resource.mime_type || "").toLowerCase();
  const extension = String(resource.title || resource.file_path || "").split(".").pop()?.toLowerCase();
  if (resource.kind === "file" && (mime === "application/pdf" || extension === "pdf")) return "pdf";
  if (resource.kind === "file" && (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(extension))) return "image";
  if (["txt", "md", "markdown", "csv"].includes(extension) || mime.startsWith("text/")) return "text";
  if (resource.url && ["link", "youtube", "document"].includes(resource.kind)) return "web";
  return "unknown";
}

function getResourceIcon(resource) {
  if (resource.kind === "youtube") return Youtube;
  if (resource.kind === "link") return Link2;
  if (resource.kind === "document") return FileText;
  if (resource.kind === "file") return FileUp;
  return BookOpen;
}

function ResourcePreviewModal({ resource, onClose }) {
  const [fullResource, setFullResource] = useState(resource);
  const [fileUrl, setFileUrl] = useState("");
  const [loading, setLoading] = useState(Boolean(resource?.file_path));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!resource) return;
    let isCurrent = true;
    setFullResource(resource);
    setFileUrl("");
    setError("");
    setLoading(Boolean(resource.file_path));

    const loadResourcePreview = async () => {
      if (resource.id) {
        try {
          const { data, error: resourceError } = await supabase
            .from("session_resources")
            .select("*")
            .eq("id", resource.id)
            .maybeSingle();
          if (resourceError) throw resourceError;
          if (data && isCurrent) setFullResource((current) => ({ ...current, ...data }));
        } catch (previewError) {
          if (isCurrent) setError(previewError.message || "Unable to load saved resource text.");
        }
      }

      if (resource.file_path) {
        try {
          const { data, error: urlError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(resource.file_path, 3600);
          if (urlError) throw urlError;
          if (!data?.signedUrl) throw new Error("A preview link could not be created for this file.");
          if (isCurrent) setFileUrl(data.signedUrl);
          const isTextFile = getResourceType(resource) === "text";
          const hasExtractedText = resource.extracted_text || resource.text || resource.content || resource.body;
          if (isTextFile && !hasExtractedText) {
            const response = await fetch(data.signedUrl);
            if (!response.ok) throw new Error("The text file could not be read for preview.");
            const text = await response.text();
            if (isCurrent) setFullResource((current) => ({ ...current, content: text }));
          }
        } catch (previewError) {
          if (isCurrent) setError(previewError.message || "Unable to create a secure file preview link.");
        }
      }

      if (isCurrent) setLoading(false);
    };

    loadResourcePreview();
    return () => {
      isCurrent = false;
    };
  }, [resource]);

  if (!resource) return null;

  const type = getResourceType(fullResource);
  const Icon = getResourceIcon(fullResource);
  const date = fullResource.created_at ? new Date(fullResource.created_at).toLocaleDateString() : "";
  let domain = "";
  try {
    domain = fullResource.url ? new URL(fullResource.url).hostname : "";
  } catch {
    domain = "";
  }
  const extractedText = cleanPreviewText(
    fullResource.extracted_text ?? fullResource.text ?? fullResource.content ?? fullResource.body ?? ""
  );
  const fileHref = fileUrl;

  return (
    <ResponsiveSheet
      isOpen={Boolean(resource)}
      onClose={onClose}
      title={fullResource.title || "Resource preview"}
      maxWidth="max-w-4xl"
    >
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          {domain && <span className="max-w-full truncate rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{domain}</span>}
          {fullResource.kind && <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{fullResource.kind}</span>}
          {date && <span>{date}</span>}
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" aria-hidden="true" /> Loading preview...
          </div>
        ) : type === "pdf" && fileHref ? (
          <div className="flex min-h-[45dvh] flex-col gap-3">
            <object data={fileHref} type="application/pdf" className="min-h-[45dvh] w-full flex-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="p-4 text-xs text-slate-600 dark:text-slate-300">
                PDF preview is unavailable. Use the download link below.
              </p>
            </object>
            <a href={fileHref} download={fullResource.title} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 focus-visible:outline-none">
              <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download PDF
            </a>
          </div>
        ) : type === "image" && fileHref ? (
          <div className="flex max-h-[60dvh] min-h-48 items-center justify-center rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
            <img src={fileHref} alt={fullResource.title || "Resource preview"} className="max-h-[55dvh] max-w-full object-contain" />
          </div>
        ) : type === "web" ? (
          <div className="space-y-4">
            {extractedText ? (
              <div className="max-h-[50dvh] overflow-y-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                {extractedText}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No saved extracted text is available for this link.
              </p>
            )}
            {fullResource.url && (
              <a href={sanitizeUrl(fullResource.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Open original
              </a>
            )}
          </div>
        ) : type === "text" || extractedText ? (
          <div className="max-h-[55dvh] overflow-y-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
            {extractedText || "No saved text is available for this resource."}
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <dl className="grid gap-2 text-xs sm:grid-cols-[auto_1fr]">
              <dt className="font-semibold text-slate-500 dark:text-slate-400">Type</dt>
              <dd className="break-all text-slate-800 dark:text-slate-200">{fullResource.mime_type || fullResource.kind || "Unknown"}</dd>
              {fullResource.extraction_status && <><dt className="font-semibold text-slate-500 dark:text-slate-400">Status</dt><dd className="capitalize text-slate-800 dark:text-slate-200">{fullResource.extraction_status}</dd></>}
            </dl>
            {(fileHref || fullResource.url) && (
              <a href={fileHref || sanitizeUrl(fullResource.url)} download={fileHref ? fullResource.title : undefined} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                {fileHref ? <Download className="h-3.5 w-3.5" aria-hidden="true" /> : <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />}
                {fileHref ? "Download file" : "Open original"}
              </a>
            )}
          </div>
        )}
      </div>
    </ResponsiveSheet>
  );
}

export default ResourcePreviewModal;
