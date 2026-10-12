import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowUp,
  Award,
  BookOpen,
  Bookmark,
  Calendar,
  Check,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Columns,
  Compass,
  Copy,
  Eraser,
  Eye,
  EyeOff,
  FileText,
  GitBranch,
  Grid,
  HelpCircle,
  Layers,
  ListTodo,
  Maximize2,
  Minimize2,
  PenTool,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import LumoAvatar from "../../common/LumoAvatar";
import ResponsiveSheet from "../../common/ResponsiveSheet";
import TypewriterText from "./TypewriterText";
import "katex/dist/katex.min.css";
import {
  LUMO_CATEGORIES,
  LUMO_PROMPTS,
  FEATURED_PROMPTS,
  hasPlaceholder,
  extractPlaceholders,
  getPromptsByCategory,
  searchPrompts,
  getFavoritePromptIds,
  toggleFavoritePrompt,
  getRecentPromptIds,
  addRecentPrompt,
} from "../../../lib/lumoPrompts";

// Dynamic Lucide Icon Mapper
const ICON_MAP = {
  BookOpen,
  HelpCircle,
  Calendar,
  FileText,
  Award,
  Layers,
  Sparkles,
  Columns,
  AlertTriangle,
  CheckSquare,
  UserCheck,
  Activity,
  Clock,
  ListTodo,
  Compass,
  CheckCircle,
  Grid,
  GitBranch,
  Bookmark,
  Zap,
  ShieldAlert,
  PenTool,
  RefreshCw,
  Star,
};

function DynamicIcon({ name, className = "h-4 w-4" }) {
  const IconComponent = ICON_MAP[name] || Sparkles;
  return <IconComponent className={className} />;
}

const AITutorChat = ({
  isOpen,
  mode = "popout",
  setMode,
  onClose,
  messages = [],
  currentMessage = "",
  onMessageChange,
  onSendMessage,
  onClear,
  onRetry,
  onActionExecute,
  width = 380,
  theme,
  isTyping,
  user,
  reducedMotion = false,
}) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const isPinnedRef = useRef(true);
  const animatedMessageIdsRef = useRef(new Set());
  const isFirstMountRef = useRef(true);

  // UI state for prompt drawer, filters, preview, warnings, favorites & recents
  const [copyState, setCopyState] = useState({});
  const [isPromptsSheetOpen, setIsPromptsSheetOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewPromptId, setPreviewPromptId] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(() => getFavoritePromptIds());
  const [recentIds, setRecentIds] = useState(() => getRecentPromptIds());
  const [showPlaceholderWarning, setShowPlaceholderWarning] = useState(false);
  const [expandedUserMessages, setExpandedUserMessages] = useState({});

  const panelAccent =
    theme?.accentButton ||
    "bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600";

  // Pre-populate animated IDs for initial messages so history renders instantly
  useEffect(() => {
    if (isFirstMountRef.current && messages.length > 0) {
      messages.forEach((msg, idx) => {
        if (msg.sender === "ai") {
          const key = msg.id || `msg-${idx}`;
          animatedMessageIdsRef.current.add(key);
        }
      });
      isFirstMountRef.current = false;
    }
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    if (isPinnedRef.current) {
      messagesEndRef.current?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "end",
      });
    }
  }, [reducedMotion]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
      isPinnedRef.current = distanceFromBottom < 120;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (messages.length > 0 || isTyping) {
      if (isPinnedRef.current) {
        messagesEndRef.current?.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "end",
        });
      }
    }
  }, [messages, isTyping, reducedMotion]);

  // Auto-grow textarea for long prompts
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    const nextHeight = Math.min(textareaRef.current.scrollHeight, 220);
    textareaRef.current.style.height = `${nextHeight}px`;
  }, [currentMessage]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showPlaceholderWarning) {
          setShowPlaceholderWarning(false);
          return;
        }
        if (isPromptsSheetOpen) {
          setIsPromptsSheetOpen(false);
          return;
        }
        e.preventDefault();
        if (onClose) onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isPromptsSheetOpen, showPlaceholderWarning]);

  const charCount = currentMessage.length;
  const lumoState = isTyping ? "thinking" : messages.length > 0 ? "replied" : "thinking";

  const handleCopy = async (text) => {
    if (!text) return;
    const key = text.slice(0, 32);
    try {
      await navigator.clipboard.writeText(text);
      setCopyState((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopyState((prev) => ({ ...prev, [key]: false }));
      }, 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  /**
   * Helper to select and highlight the first placeholder in the textarea
   */
  const highlightNextPlaceholder = (text, startIndex = 0) => {
    if (!textareaRef.current || !text) return;
    const regex = /\[.*?\]/g;
    regex.lastIndex = startIndex;
    const match = regex.exec(text);

    if (match) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(match.index, match.index + match[0].length);
    } else if (startIndex > 0) {
      // Loop back to beginning
      const firstMatch = /\[.*?\]/.exec(text);
      if (firstMatch) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(firstMatch.index, firstMatch.index + firstMatch[0].length);
      }
    }
  };

  /**
   * Handle Tab key navigation between placeholders inside the input box
   */
  const handleKeyDownInput = (e) => {
    if (e.key === "Tab" && !e.shiftKey && currentMessage) {
      const placeholders = extractPlaceholders(currentMessage);
      if (placeholders.length > 0) {
        e.preventDefault();
        const cursor = textareaRef.current?.selectionEnd || 0;
        highlightNextPlaceholder(currentMessage, cursor);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      attemptSendMessage();
    }
  };

  /**
   * Selection handler for prompt cards and sheet items
   */
  const handleSelectPromptObj = (promptObj) => {
    if (!promptObj) return;

    addRecentPrompt(promptObj.id);
    setRecentIds(getRecentPromptIds());

    const fullPrompt = promptObj.prompt || promptObj.text;

    if (hasPlaceholder(fullPrompt)) {
      if (onMessageChange) {
        onMessageChange(fullPrompt);
      }
      setTimeout(() => {
        highlightNextPlaceholder(fullPrompt, 0);
      }, 50);
    } else {
      if (onMessageChange) {
        onMessageChange(fullPrompt);
      }
      setTimeout(() => {
        if (onSendMessage) {
          onSendMessage(fullPrompt);
        }
      }, 50);
    }

    setIsPromptsSheetOpen(false);
  };

  /**
   * Send validation check for remaining unfilled placeholders
   */
  const attemptSendMessage = (forceSend = false) => {
    if (!currentMessage.trim() || isTyping) return;

    if (!forceSend && hasPlaceholder(currentMessage)) {
      setShowPlaceholderWarning(true);
      return;
    }

    setShowPlaceholderWarning(false);
    if (onSendMessage) {
      onSendMessage();
    }
  };

  const handleToggleFavorite = (e, promptId) => {
    e.stopPropagation();
    toggleFavoritePrompt(promptId);
    setFavoriteIds(getFavoritePromptIds());
  };

  // Filtered prompt list for drawer sheet based on category, search, recents, and favorites
  const displayedPrompts = useMemo(() => {
    if (selectedCategory === "favorites") {
      return LUMO_PROMPTS.filter((p) => favoriteIds.includes(p.id));
    }
    if (selectedCategory === "recents") {
      return recentIds
        .map((id) => LUMO_PROMPTS.find((p) => p.id === id))
        .filter(Boolean);
    }

    let result = searchPrompts(searchQuery, selectedCategory);
    return result;
  }, [selectedCategory, searchQuery, favoriteIds, recentIds]);

  const ActionCard = ({ action }) => {
    if (!action) return null;
    const isSuccess = action.status === "success";

    if (action.type === "study_plan") {
      const data = action.data || {};
      return (
        <div
          className={`mt-2.5 rounded-2xl border p-3 text-xs shadow-sm ${
            isSuccess
              ? "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
          }`}
        >
          <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
            <ListTodo className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{action.summary}</span>
          </div>
          {isSuccess && Array.isArray(data.milestones) && (
            <div className="mt-2 space-y-1.5 border-t border-emerald-200/60 pt-2 dark:border-emerald-800/60">
              {data.milestones.map((m, idx) => (
                <div key={idx} className="flex items-start justify-between gap-2">
                  <span>
                    <strong>
                      {idx + 1}. {m.title}
                    </strong>
                    : {m.description}
                  </span>
                  <span className="shrink-0 font-medium opacity-75">{m.estimated_minutes}m</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (action.type === "scheduled_session") {
      const data = action.data || {};
      return (
        <div
          className={`mt-2.5 rounded-2xl border p-3 text-xs shadow-sm ${
            isSuccess
              ? "border-sky-200 bg-sky-50/80 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
              : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
          }`}
        >
          <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
            <Calendar className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
            <span>{action.summary}</span>
          </div>
          {isSuccess && (
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-slate-600 dark:text-slate-300">
              <div>
                <Clock className="mr-1 inline h-3 w-3" />
                {data.date} at {data.time}
              </div>
              <div>Duration: {data.duration} min</div>
              <div>Focus: {data.focus}</div>
            </div>
          )}
        </div>
      );
    }

    if (action.type === "flashcards") {
      return (
        <div
          className={`mt-2.5 rounded-2xl border p-3 text-xs shadow-sm ${
            isSuccess
              ? "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
              : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{action.summary}</span>
            </div>
            {isSuccess && (
              <button
                type="button"
                onClick={() => onActionExecute && onActionExecute({ type: "open_flashcards" })}
                className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-amber-700 min-h-[36px]"
              >
                Open flashcards
              </button>
            )}
          </div>
        </div>
      );
    }

    if (action.type === "quiz") {
      const data = action.data || {};
      return (
        <div
          className={`mt-2.5 rounded-2xl border p-3 text-xs shadow-sm ${
            isSuccess
              ? "border-violet-200 bg-violet-50/80 text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200"
              : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <HelpCircle className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
              <span>{action.summary}</span>
            </div>
            {isSuccess && (
              <button
                type="button"
                onClick={() => onActionExecute && onActionExecute({ type: "open_quiz", data })}
                className="rounded-lg bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-violet-700 min-h-[36px]"
              >
                Open practice set
              </button>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const MessageBubble = ({ message, msgKey }) => {
    if (message.sender === "ai") {
      const isError = Boolean(message.isError);
      const bubbleText = String(message.text || "");
      const shouldAnimate = !isError && !animatedMessageIdsRef.current.has(msgKey);

      const markdownComponents = {
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-6">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-4">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-4">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-950 dark:text-white">{children}</strong>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-violet-600 underline underline-offset-2 dark:text-violet-300"
          >
            {children}
          </a>
        ),
        code: ({ inline, children, className, ...props }) => {
          const codeValue = String(children).replace(/\n$/, "");
          if (inline) {
            return (
              <code
                className="rounded-md bg-slate-200 px-1.5 py-0.5 font-mono text-[11px] text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                {...props}
              >
                {children}
              </code>
            );
          }

          return (
            <div className="relative my-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 text-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-300">
                <span>{className?.replace("language-", "") || "code"}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(codeValue)}
                  aria-label="Copy code"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-200 transition hover:border-slate-500 hover:text-white min-h-[36px]"
                >
                  {copyState[codeValue.slice(0, 32)] ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copyState[codeValue.slice(0, 32)] ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="overflow-x-auto p-3 text-[12px] leading-5">
                <code {...props}>{codeValue}</code>
              </pre>
            </div>
          );
        },
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-left text-xs dark:border-slate-700">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-slate-300 bg-slate-100 p-1.5 font-semibold dark:border-slate-700 dark:bg-slate-800">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-slate-300 p-1.5 dark:border-slate-700">{children}</td>
        ),
      };

      const handleAnimationComplete = () => {
        animatedMessageIdsRef.current.add(msgKey);
      };

      return (
        <div className="group flex gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center">
            {isError ? (
              <AlertCircle className="h-5 w-5 text-rose-500" />
            ) : (
              <LumoAvatar size="xs" state="replied" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              <span>Lumo</span>
            </div>

            <div className="relative max-w-[90%] rounded-2xl rounded-tl-md border border-slate-200 bg-white/80 p-3 text-sm leading-6 text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100">
              <TypewriterText
                text={bubbleText}
                shouldAnimate={shouldAnimate}
                onComplete={handleAnimationComplete}
                onTick={scrollToBottom}
                reducedMotion={reducedMotion}
                components={markdownComponents}
              />

              {isError && onRetry && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-rose-700 min-h-[36px]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry message
                  </button>
                </div>
              )}

              <div className="pointer-events-none absolute -right-2 top-2 flex translate-x-full items-center gap-1 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
                <button
                  type="button"
                  aria-label="Copy Lumo message"
                  onClick={() => handleCopy(bubbleText)}
                  className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  {copyState[bubbleText.slice(0, 32)] ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                {onRetry && (
                  <button
                    type="button"
                    aria-label="Regenerate Lumo response"
                    onClick={onRetry}
                    className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {Array.isArray(message.actions) && message.actions.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.actions.map((act, i) => (
                  <ActionCard key={i} action={act} />
                ))}
              </div>
            )}

            {message.eventType === "quiz_finished" && (
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => handleSelectPromptObj({ text: "Let's go through the questions I missed." })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-800 shadow-sm transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-200 min-h-[36px]"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  Review my mistakes
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // User Message Bubble with Collapsed Card for Long Prompts
    const userText = String(message.text || "");
    const isLongPrompt = userText.length > 220 || userText.startsWith("ROLE:");
    const isExpanded = Boolean(expandedUserMessages[msgKey]);

    // Extract title or first line if collapsed
    const firstLine = userText.split("\n")[0].replace(/^ROLE:\s*/, "");
    const matchedPrompt = LUMO_PROMPTS.find((p) => p.prompt === userText);
    const cardTitle = matchedPrompt ? matchedPrompt.title : "Structured Prompt";

    return (
      <div className="flex justify-end gap-3">
        <div className="min-w-0 max-w-[85%] text-right">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            You
          </div>

          {isLongPrompt && !isExpanded ? (
            <div className="inline-block w-full max-w-md rounded-2xl rounded-tr-md border border-violet-200/80 bg-violet-50/90 p-3.5 text-left text-xs shadow-sm dark:border-violet-800/80 dark:bg-violet-950/60">
              <div className="mb-1 flex items-center justify-between gap-2 border-b border-violet-200/60 pb-1.5 dark:border-violet-800/60">
                <span className="flex items-center gap-1.5 font-bold text-violet-900 dark:text-violet-200">
                  <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  {cardTitle}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedUserMessages((prev) => ({ ...prev, [msgKey]: true }))
                  }
                  className="inline-flex items-center gap-1 rounded-md bg-violet-200/80 px-2 py-0.5 text-[10px] font-semibold text-violet-900 transition hover:bg-violet-300 dark:bg-violet-800 dark:text-violet-100 min-h-[32px]"
                >
                  <Eye className="h-3 w-3" />
                  Show full prompt
                </button>
              </div>
              <p className="line-clamp-2 text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                {firstLine}
              </p>
            </div>
          ) : (
            <div className={`inline-block rounded-2xl rounded-tr-md p-3.5 text-left text-sm leading-6 text-white shadow-sm ${panelAccent}`}>
              {isLongPrompt && (
                <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/20 pb-1 text-xs">
                  <span className="font-semibold">{cardTitle}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedUserMessages((prev) => ({ ...prev, [msgKey]: false }))
                    }
                    className="inline-flex items-center gap-1 rounded bg-black/20 px-1.5 py-0.5 text-[10px] hover:bg-black/30 min-h-[32px]"
                  >
                    <EyeOff className="h-3 w-3" /> Collapse
                  </button>
                </div>
              )}
              <div className="whitespace-pre-wrap">{userText}</div>
            </div>
          )}
        </div>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
          {user?.avatar ? (
            <img src={user.avatar} alt={user?.name || "You"} className="h-full w-full object-cover" />
          ) : (
            <span>{user?.name?.[0]?.toUpperCase() || "U"}</span>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="flex h-full w-full max-w-full flex-col border-l border-slate-200 bg-white shadow-2xl transition-all duration-200 dark:border-slate-800 dark:bg-[#101826]"
        style={{
          width: mode === "fullpage" ? "100%" : typeof width === "number" ? `${width}px` : width,
          maxWidth: "100vw",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 p-4 pt-[max(1rem,env(safe-area-inset-top))] dark:border-slate-800 dark:bg-[#151f2d]/90">
          <div className="flex items-center gap-3">
            <button
              type="button"
              title="Back"
              aria-label="Back"
              onClick={onClose}
              className="rounded-full p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <LumoAvatar size="sm" state={lumoState} />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Lumo</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Your AI study partner</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Prompts menu"
              aria-label="Prompts menu"
              onClick={() => setIsPromptsSheetOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300 min-h-[36px]"
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              <span>Prompts</span>
            </button>
            <button
              type="button"
              title="Clear conversation"
              aria-label="Clear conversation"
              onClick={onClear}
              className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/60 dark:hover:bg-slate-800 dark:hover:text-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Eraser className="h-4 w-4" />
            </button>
            {mode === "popout" ? (
              <button
                type="button"
                title="Expand to full page"
                aria-label="Expand to full page"
                onClick={() => setMode && setMode("fullpage")}
                className="hidden rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/60 dark:hover:bg-slate-800 dark:hover:text-slate-200 md:inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            ) : mode === "fullpage" ? (
              <button
                type="button"
                title="Return to pop-out chat"
                aria-label="Return to pop-out chat"
                onClick={() => setMode && setMode("popout")}
                className="hidden rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/60 dark:hover:bg-slate-800 dark:hover:text-slate-200 md:inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              title="Close Lumo"
              aria-label="Close Lumo"
              onClick={onClose}
              className="hidden rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/60 dark:hover:bg-slate-800 dark:hover:text-slate-200 md:inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Close AI tutor"
              aria-label="Close AI tutor"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/60 dark:hover:bg-slate-800 dark:hover:text-slate-200 md:hidden min-h-[44px] min-w-[44px]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages / Empty State Container */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 lg:p-5" role="log" aria-live="polite">
          <div className={`mx-auto w-full space-y-4 ${mode === "fullpage" ? "max-w-3xl" : ""}`}>
            {messages.length === 0 && !isTyping && (
              <div className="flex min-h-full items-center justify-center pt-2">
                <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                  <div className="relative mx-auto mb-3 flex items-center justify-center">
                    <div className="absolute h-20 w-20 rounded-full bg-emerald-500/20 blur-xl dark:bg-emerald-400/20" aria-hidden="true" />
                    <LumoAvatar size="lg" state="thinking" className="relative z-10 animate-lumo-gentle-float" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Hi, I'm Lumo. What are we studying?</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Tap a structured prompt suggestion to start or ask anything.
                  </p>

                  {/* Empty state category tabs & prompt cards */}
                  <div className="mt-5 space-y-3 text-left">
                    {/* Horizontal scroll category tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("all")}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition min-h-[36px] ${
                          selectedCategory === "all"
                            ? "bg-violet-600 text-white dark:bg-violet-500"
                            : "bg-slate-200/80 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        All Categories
                      </button>
                      {LUMO_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition min-h-[36px] ${
                            selectedCategory === cat.id
                              ? "bg-violet-600 text-white dark:bg-violet-500"
                              : "bg-slate-200/80 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Featured / Category Cards Grid */}
                    <div className="grid gap-2.5 sm:grid-cols-2 max-h-[260px] overflow-y-auto pr-1">
                      {getPromptsByCategory(selectedCategory).slice(0, 6).map((promptObj) => (
                        <button
                          key={promptObj.id}
                          type="button"
                          onClick={() => handleSelectPromptObj(promptObj)}
                          className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-violet-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-500/60 dark:border-slate-800 dark:bg-slate-800/90 dark:hover:border-violet-500/60 min-h-[84px]"
                        >
                          <div>
                            <div className="mb-1 flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-[11px] font-bold text-violet-700 dark:text-violet-300">
                                <DynamicIcon name={promptObj.icon} className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                                {promptObj.title}
                              </span>
                              {hasPlaceholder(promptObj.prompt) && (
                                <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                                  Fill blanks
                                </span>
                              )}
                            </div>
                            <p className="line-clamp-2 text-[11px] text-slate-600 dark:text-slate-300">
                              {promptObj.description}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => setIsPromptsSheetOpen(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400 min-h-[36px]"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Explore all 25 ready-made prompts
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => {
              const msgKey = msg.id || `msg-${idx}`;
              return <MessageBubble key={msgKey} message={msg} msgKey={msgKey} />;
            })}

            {isTyping && (
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center">
                  <LumoAvatar size="xs" state="thinking" />
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                  <span>Lumo is thinking</span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 dark:bg-slate-300" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:120ms] dark:bg-slate-300" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:240ms] dark:bg-slate-300" />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input & Active Conversation Quick Chips */}
        <div className="border-t border-slate-200 bg-slate-50/90 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-[#151f2d]/90">
          <div className={`mx-auto w-full ${mode === "fullpage" ? "max-w-3xl" : ""}`}>
            {messages.length > 0 && (
              <div className="mb-2.5 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setIsPromptsSheetOpen(true)}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-violet-300 bg-violet-100/80 px-3 py-1.5 text-[11px] font-semibold text-violet-800 transition hover:bg-violet-200 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-200 min-h-[36px]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  <span>Prompts</span>
                </button>
                {FEATURED_PROMPTS.map((promptObj) => (
                  <button
                    key={`quick-${promptObj.id}`}
                    type="button"
                    onClick={() => handleSelectPromptObj(promptObj)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:border-violet-300 hover:text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-violet-500/60 dark:hover:text-violet-200 min-h-[36px]"
                  >
                    {promptObj.title}: {promptObj.description}
                  </button>
                ))}
              </div>
            )}

            {/* Placeholder Warning Banner */}
            {showPlaceholderWarning && (
              <div className="mb-2.5 flex items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-200">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Fill in the highlighted blanks before sending or send anyway.</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowPlaceholderWarning(false)}
                    className="rounded-lg bg-amber-200/80 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100 min-h-[36px]"
                  >
                    Keep editing
                  </button>
                  <button
                    type="button"
                    onClick={() => attemptSendMessage(true)}
                    className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 min-h-[36px]"
                  >
                    Send anyway
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm transition focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-end gap-2 p-2">
                <button
                  type="button"
                  title="Open prompts menu"
                  aria-label="Open prompts menu"
                  onClick={() => setIsPromptsSheetOpen(true)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-slate-700 min-h-[44px] min-w-[44px]"
                >
                  <Sparkles className="h-5 w-5" />
                </button>

                <label htmlFor="lumo-input" className="sr-only">
                  Message Lumo
                </label>
                <textarea
                  id="lumo-input"
                  ref={textareaRef}
                  rows={1}
                  value={currentMessage}
                  onChange={(e) =>
                    onMessageChange && onMessageChange(e.target.value.slice(0, 4000))
                  }
                  onKeyDown={handleKeyDownInput}
                  placeholder="Message Lumo or choose a prompt..."
                  aria-label="Message Lumo"
                  className="min-h-[42px] max-h-[220px] min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-base sm:text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => attemptSendMessage(false)}
                  disabled={!currentMessage.trim() || isTyping}
                  aria-label="Send message"
                  title="Send message"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md transition focus:outline-none focus:ring-2 focus:ring-violet-500/60 disabled:cursor-not-allowed disabled:opacity-40 min-h-[44px] min-w-[44px] ${panelAccent}`}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="text-[10px] text-slate-400 dark:text-slate-500">
                Tip: Press <kbd className="rounded bg-slate-200 px-1 py-0.5 font-mono text-[9px] dark:bg-slate-700">Tab</kbd> to jump between blanks
              </div>
              {charCount > 3500 && (
                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  {charCount} / 4000
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ready-Made Prompts Bottom Sheet / Popover Drawer */}
      <ResponsiveSheet
        isOpen={isPromptsSheetOpen}
        onClose={() => setIsPromptsSheetOpen(false)}
        title="Lumo Ready-Made Prompts"
      >
        <div className="space-y-4 pb-safe">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts by keyword..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white min-h-[44px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition min-h-[36px] ${
                selectedCategory === "all"
                  ? "bg-violet-600 text-white dark:bg-violet-500"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              All Prompts ({LUMO_PROMPTS.length})
            </button>
            {favoriteIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCategory("favorites")}
                className={`shrink-0 flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition min-h-[36px] ${
                  selectedCategory === "favorites"
                    ? "bg-amber-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                <Star className="h-3.5 w-3.5 fill-current" />
                Favorites ({favoriteIds.length})
              </button>
            )}
            {recentIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCategory("recents")}
                className={`shrink-0 flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition min-h-[36px] ${
                  selectedCategory === "recents"
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Recently used
              </button>
            )}
            {LUMO_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition min-h-[36px] ${
                  selectedCategory === cat.id
                    ? "bg-violet-600 text-white dark:bg-violet-500"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Prompt Cards List / Grid */}
          <div className="grid gap-3 sm:grid-cols-2 max-h-[420px] overflow-y-auto pr-1">
            {displayedPrompts.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No prompts found matching your search or category filter.
              </div>
            ) : (
              displayedPrompts.map((promptObj) => {
                const isFav = favoriteIds.includes(promptObj.id);
                const isPreviewing = previewPromptId === promptObj.id;
                const fullPromptText = promptObj.prompt || promptObj.text;
                const needsFill = hasPlaceholder(fullPromptText);

                return (
                  <div
                    key={promptObj.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-violet-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-violet-500/60"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-violet-700 dark:text-violet-300">
                          <DynamicIcon name={promptObj.icon} className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                          {promptObj.title}
                        </span>
                        <div className="flex items-center gap-1">
                          {needsFill && (
                            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                              Fill blanks
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleToggleFavorite(e, promptObj.id)}
                            title={isFav ? "Remove from favorites" : "Add to favorites"}
                            className="p-1 text-slate-400 hover:text-amber-500 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                          >
                            <Star className={`h-4 w-4 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
                          </button>
                        </div>
                      </div>

                      {/* Card Description */}
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                        {promptObj.description}
                      </p>

                      {/* Expandable Preview Option */}
                      {isPreviewing && (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-mono leading-relaxed text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {fullPromptText}
                        </div>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPromptId(isPreviewing ? null : promptObj.id)
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 min-h-[36px]"
                      >
                        {isPreviewing ? <ChevronUp className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {isPreviewing ? "Hide preview" : "Preview full text"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectPromptObj(promptObj)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 min-h-[36px]"
                      >
                        <span>Use Prompt</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </ResponsiveSheet>
    </>
  );
};

export default AITutorChat;
