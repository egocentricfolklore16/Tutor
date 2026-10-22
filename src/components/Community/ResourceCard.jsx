import React, { useState, useEffect } from "react";
import { ExternalLink, Download, Loader2, RefreshCw, AlertCircle, X } from "lucide-react";
import supabase from "../../lib/supabase";
import { getResourceSignedUrl, sanitizeUrl } from "../../lib/communityChat";

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes) || Number(bytes) <= 0) return null;
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileTypeInfo(resource) {
  const fileName = resource.file_name || resource.title || resource.file_path || resource.url || "";
  const extMatch = fileName.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
  const ext = extMatch ? extMatch[1].toUpperCase() : "";
  const kind = (resource.kind || resource.file_type || "").toLowerCase();

  if (ext === "PDF" || kind.includes("pdf")) {
    return {
      ext: "PDF",
      typeLabel: "PDF",
      isImage: false,
      colorClass: "bg-rose-500/20 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400 border-rose-500/30",
    };
  }
  if (["DOC", "DOCX"].includes(ext) || kind.includes("word") || kind.includes("doc")) {
    return {
      ext: ext || "DOC",
      typeLabel: ext || "DOC",
      isImage: false,
      colorClass: "bg-blue-500/20 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 border-blue-500/30",
    };
  }
  if (["XLS", "XLSX", "CSV"].includes(ext) || kind.includes("sheet") || kind.includes("excel") || kind.includes("csv")) {
    return {
      ext: ext || "XLS",
      typeLabel: ext || "Spreadsheet",
      isImage: false,
      colorClass: "bg-emerald-500/20 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400 border-emerald-500/30",
    };
  }
  if (["PPT", "PPTX"].includes(ext) || kind.includes("presentation") || kind.includes("powerpoint") || kind.includes("ppt")) {
    return {
      ext: ext || "PPT",
      typeLabel: ext || "Presentation",
      isImage: false,
      colorClass: "bg-amber-500/20 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400 border-amber-500/30",
    };
  }
  if (["PNG", "JPG", "JPEG", "GIF", "WEBP", "SVG"].includes(ext) || kind.includes("image") || kind.includes("img")) {
    return {
      ext: ext || "IMG",
      typeLabel: "Image",
      isImage: true,
      colorClass: "bg-purple-500/20 text-purple-600 dark:bg-purple-950/70 dark:text-purple-400 border-purple-500/30",
    };
  }
  return {
    ext: ext || "FILE",
    typeLabel: ext || "File",
    isImage: false,
    colorClass: "bg-slate-500/20 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-500/30",
  };
}

export default function ResourceCard({ resourceId, isOwn = false, isOptimistic = false, failed = false, onRetry }) {
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [isFullscreenImage, setIsFullscreenImage] = useState(false);

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
        if (isMounted && data) {
          setResource(data);

          const info = getFileTypeInfo(data);
          if (info.isImage) {
            if (data.file_path) {
              const url = await getResourceSignedUrl(supabase, data.file_path);
              if (isMounted) setImageUrl(url || data.url);
            } else if (data.url) {
              if (isMounted) setImageUrl(data.url);
            }
          }
        }
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

  if (loading || isOptimistic) {
    return (
      <div className={`my-1 flex items-center gap-2 rounded-xl border p-2.5 text-[12px] font-normal max-w-full ${
        isOwn
          ? "border-emerald-400/30 bg-emerald-700/30 text-white"
          : "border-slate-200 bg-slate-100/80 dark:border-slate-700/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300"
      }`}>
        <Loader2 className="h-4 w-4 animate-spin text-emerald-500 shrink-0" />
        <span className="truncate">Sharing file attachment...</span>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="my-1 flex items-center justify-between gap-2 rounded-xl border border-rose-300 bg-rose-50/90 p-2.5 text-[12px] font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-200 max-w-full">
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          <span className="truncate">Upload failed</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-rose-700 transition"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  if (!resource) {
    return (
      <div className={`my-1 rounded-xl border p-2.5 text-[12px] font-normal ${
        isOwn
          ? "border-emerald-400/30 bg-emerald-700/30 text-emerald-100"
          : "border-slate-200 bg-slate-100/80 dark:border-slate-700/80 dark:bg-slate-800/80 text-slate-500"
      }`}>
        Shared resource unavailable.
      </div>
    );
  }

  const displayTitle = resource.title || resource.file_name || "Attachment";
  const fileTypeInfo = getFileTypeInfo(resource);
  const formattedSize = formatFileSize(
    resource.file_size || resource.size_bytes || resource.bytes || resource.size
  );

  const handleOpenResource = async () => {
    if (opening) return;
    setOpening(true);
    try {
      if (resource.file_path) {
        const signedUrl = await getResourceSignedUrl(supabase, resource.file_path);
        if (signedUrl) {
          window.open(signedUrl, "_blank", "noopener,noreferrer");
        } else if (resource.url) {
          const safeUrl = sanitizeUrl(resource.url);
          if (safeUrl !== "#") {
            window.open(safeUrl, "_blank", "noopener,noreferrer");
          }
        }
      } else if (resource.url) {
        const safeUrl = sanitizeUrl(resource.url);
        if (safeUrl !== "#") {
          window.open(safeUrl, "_blank", "noopener,noreferrer");
        }
      }
    } catch (err) {
      console.error("Failed to open resource:", err);
    } finally {
      setOpening(false);
    }
  };

  // Render Inline Image Thumbnail if image
  if (fileTypeInfo.isImage && imageUrl) {
    return (
      <div className="my-1.5 max-w-full">
        <img
          src={imageUrl}
          alt={displayTitle}
          onClick={() => setIsFullscreenImage(true)}
          className="max-h-60 w-auto rounded-lg object-cover cursor-pointer hover:opacity-95 transition shadow-xs"
        />

        {/* Fullscreen Lightbox Modal */}
        {isFullscreenImage && (
          <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
            onClick={() => setIsFullscreenImage(false)}
          >
            <button
              type="button"
              aria-label="Close picture"
              onClick={() => setIsFullscreenImage(false)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={imageUrl}
              alt={displayTitle}
              className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
            />
          </div>
        )}
      </div>
    );
  }

  // Polished Shared File Card layout inside bubble
  return (
    <div
      onClick={handleOpenResource}
      className={`my-1 flex items-center justify-between gap-2.5 rounded-xl border p-2.5 shadow-xs max-w-full min-w-0 transition cursor-pointer ${
        isOwn
          ? "border-emerald-400/30 bg-emerald-700/40 text-white hover:bg-emerald-700/60"
          : "border-slate-200/80 bg-slate-100/90 dark:border-slate-700/80 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-900 dark:text-white"
      }`}
    >
      {/* File type icon block 36x36 */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-medium text-[10px] uppercase tracking-wider border ${fileTypeInfo.colorClass}`}>
        {fileTypeInfo.ext.slice(0, 4)}
      </div>

      {/* Middle Text block */}
      <div className="min-w-0 flex-1">
        <p
          title={displayTitle}
          className={`line-clamp-2 text-[13px] font-medium leading-snug ${
            isOwn ? "text-white" : "text-slate-900 dark:text-white"
          }`}
        >
          {displayTitle}
        </p>
        <p className={`text-[11px] font-normal mt-0.5 ${
          isOwn ? "text-emerald-100" : "text-slate-500 dark:text-slate-400"
        }`}>
          {fileTypeInfo.typeLabel}{formattedSize ? ` · ${formattedSize}` : ""}
        </p>
      </div>

      {/* Action button icon-only 36px */}
      <button
        type="button"
        disabled={opening}
        onClick={(e) => {
          e.stopPropagation();
          handleOpenResource();
        }}
        aria-label={resource.file_path ? "Download file" : "Open resource"}
        title={resource.file_path ? "Download file" : "Open resource"}
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
          isOwn
            ? "bg-emerald-500/30 hover:bg-emerald-400/50 text-white"
            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white"
        }`}
      >
        {opening ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : resource.file_path ? (
          <Download className="h-4 w-4" />
        ) : (
          <ExternalLink className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
