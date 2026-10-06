import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Download, ExternalLink, FileText, FileUp, Link2, Loader2, X, Youtube } from "lucide-react";
import supabase from "../../lib/supabase";

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
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [fullResource, setFullResource] = useState(resource);
  const [fileUrl, setFileUrl] = useState("");
  const [loading, setLoading] = useState(Boolean(resource.file_path));
  const [error, setError] = useState("");
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
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

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      } else if (event.key === "Tab" && modalRef.current) {
        const focusable = [...modalRef.current.querySelectorAll(
          'a[href], button:not([disabled]), iframe, [tabindex="0"]'
        )].filter((element) => !element.hasAttribute("hidden"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  if (!resource || typeof document === "undefined") return null;

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

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm dark:bg-black/70"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resource-preview-title"
        className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-[#18211f] dark:text-slate-100"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-700 sm:px-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 dark:bg-green-950/35 dark:text-green-400">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 id="resource-preview-title" className="min-w-0 flex-1 truncate text-base font-bold sm:text-lg" title={fullResource.title}>
            {fullResource.title || "Resource preview"}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:ring-green-400"
            aria-label="Close resource preview"
            title="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {domain && <span className="max-w-full truncate rounded-full bg-green-50 px-2.5 py-1 font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-300">{domain}</span>}
            {fullResource.kind && <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{fullResource.kind}</span>}
            {date && <span>{date}</span>}
          </div>

          {error && (
            <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading preview...
            </div>
          ) : type === "pdf" && fileHref ? (
            <div className="flex min-h-[50dvh] flex-col gap-3">
              <object data={fileHref} type="application/pdf" className="min-h-[50dvh] w-full flex-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="p-4 text-sm text-slate-600 dark:text-slate-300">
                  PDF preview is unavailable. Use the download link below.
                </p>
              </object>
              <a href={fileHref} download={fullResource.title} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:bg-green-500 dark:hover:bg-green-400 dark:focus-visible:ring-green-400">
                <Download className="h-4 w-4" aria-hidden="true" /> Download PDF
              </a>
            </div>
          ) : type === "image" && fileHref ? (
            <div className="flex max-h-[65dvh] min-h-64 items-center justify-center rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
              <img src={fileHref} alt={fullResource.title || "Resource preview"} className="max-h-[60dvh] max-w-full object-contain" />
            </div>
          ) : type === "web" ? (
            <div className="space-y-4">
              {extractedText ? (
                <div className="max-h-[55dvh] overflow-y-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300 sm:p-6">
                  {extractedText}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No saved extracted text is available for this link.
                </p>
              )}
              {fullResource.url && (
                <a href={fullResource.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:bg-green-500 dark:hover:bg-green-400 dark:focus-visible:ring-green-400">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open original
                </a>
              )}
            </div>
          ) : type === "text" || extractedText ? (
            <div className="max-h-[60dvh] overflow-y-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300 sm:p-6">
              {extractedText || "No saved text is available for this resource."}
            </div>
          ) : (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/50">
              <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr]">
                <dt className="font-semibold text-slate-500 dark:text-slate-400">Type</dt>
                <dd className="break-all text-slate-800 dark:text-slate-200">{fullResource.mime_type || fullResource.kind || "Unknown"}</dd>
                {fullResource.extraction_status && <><dt className="font-semibold text-slate-500 dark:text-slate-400">Status</dt><dd className="capitalize text-slate-800 dark:text-slate-200">{fullResource.extraction_status}</dd></>}
              </dl>
              {(fileHref || fullResource.url) && (
                <a href={fileHref || fullResource.url} download={fileHref ? fullResource.title : undefined} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:bg-green-500 dark:hover:bg-green-400 dark:focus-visible:ring-green-400">
                  {fileHref ? <Download className="h-4 w-4" aria-hidden="true" /> : <ExternalLink className="h-4 w-4" aria-hidden="true" />}
                  {fileHref ? "Download file" : "Open original"}
                </a>
              )}
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body
  );
}

export default ResourcePreviewModal;
