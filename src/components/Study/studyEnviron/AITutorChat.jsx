import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Copy,
  Eraser,
  HelpCircle,
  Layers,
  ListTodo,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
  X,
  MessageSquarePlus,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import LumoAvatar from "../../common/LumoAvatar";
import { useAITutor } from "../../../app/AITutorContext";
import ResponsiveSheet from "../../common/ResponsiveSheet";
import TypewriterText from "./TypewriterText";
import "katex/dist/katex.min.css";
import {
  LUMO_CATEGORIES,
  LUMO_PROMPTS,
  FEATURED_PROMPTS,
  hasPlaceholder,
  getPromptsByCategory,
  getLumoGreeting,
  formatPromptForProfile,
} from "../../../lib/lumoPrompts";
import { sanitizeUrl } from "../../../lib/communityChat";

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
  isTyping,
  user,
  profile,
  reducedMotion = false,
}) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const isPinnedRef = useRef(true);
  const animatedMessageIdsRef = useRef(new Set());
  const isFirstMountRef = useRef(true);
  const previousMessageCountRef = useRef(messages.length);

  const { strictness = "hints_then_answer", updateStrictness } = useAITutor();
  const [copyState, setCopyState] = useState({});
  const [isPromptsSheetOpen, setIsPromptsSheetOpen] = useState(false);
  const [isModeSwitcherOpen, setIsModeSwitcherOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const MODE_LABELS = {
    always_guide: "Guide first",
    hints_then_answer: "Hints then answer",
    direct_help: "Direct help",
  };

  const currentModeLabel = MODE_LABELS[strictness] || "Hints then answer";

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

  const scrollToBottom = useCallback((force = false) => {
    if (force) isPinnedRef.current = true;
    if (isPinnedRef.current) {
      messagesEndRef.current?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "end",
      });
    }
  }, [reducedMotion]);

  const sendMessage = useCallback((text) => {
    if (!onSendMessage) return;
    isPinnedRef.current = true;
    onSendMessage(text);
    requestAnimationFrame(() => scrollToBottom(true));
  }, [onSendMessage, scrollToBottom]);

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
    const newestMessage = messages[messages.length - 1];
    const hasNewReply = messages.length > previousMessageCountRef.current && newestMessage?.sender === "ai";
    if (hasNewReply) isPinnedRef.current = true;
    if (messages.length > 0 || isTyping) {
      scrollToBottom(hasNewReply);
    }
    previousMessageCountRef.current = messages.length;
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    const nextHeight = Math.min(textareaRef.current.scrollHeight, 140);
    textareaRef.current.style.height = `${nextHeight}px`;
  }, [currentMessage]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
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
  }, [isOpen, onClose, isPromptsSheetOpen]);

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

  const handleSelectPrompt = (promptText) => {
    if (!promptText) return;

    const formattedText = formatPromptForProfile(promptText, profile);

    if (hasPlaceholder(formattedText)) {
      if (onMessageChange) {
        onMessageChange(formattedText);
      }
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const match = /\[.*?\]/.exec(formattedText);
          if (match) {
            textareaRef.current.setSelectionRange(match.index, match.index + match[0].length);
          } else {
            textareaRef.current.setSelectionRange(formattedText.length, formattedText.length);
          }
        }
      }, 50);
    } else {
      if (onMessageChange) {
        onMessageChange(formattedText);
      }
      setTimeout(() => {
        sendMessage(formattedText);
      }, 50);
    }

    setIsPromptsSheetOpen(false);
  };

  const ActionCard = ({ action }) => {
    if (!action) return null;
    const isSuccess = action.status === "success";

    if (action.type === "study_plan") {
      const data = action.data || {};
      return (
        <div className={`mt-3 rounded-2xl p-3 text-xs ${isSuccess ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" : "bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ListTodo className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{action.summary}</span>
          </div>
          {isSuccess && Array.isArray(data.milestones) && (
            <div className="mt-2 space-y-2 pt-2">
              {data.milestones.map((m, idx) => (
                <div key={idx} className="flex items-start justify-between gap-2">
                  <span>
                    <strong>{idx + 1}. {m.title}</strong>: {m.description}
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
        <div className={`mt-3 rounded-2xl p-3 text-xs ${isSuccess ? "bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200" : "bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Calendar className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
            <span>{action.summary}</span>
          </div>
          {isSuccess && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-slate-600 dark:text-slate-300">
              <div><Clock className="mr-1 inline h-4 w-4" />{data.date} at {data.time}</div>
              <div>Duration: {data.duration} min</div>
              <div>Focus: {data.focus}</div>
            </div>
          )}
        </div>
      );
    }

    if (action.type === "flashcards") {
      return (
        <div className={`mt-3 rounded-2xl p-3 text-xs ${isSuccess ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" : "bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{action.summary}</span>
            </div>
            {isSuccess && (
              <button
                type="button"
                onClick={() => onActionExecute && onActionExecute({ type: "open_flashcards" })}
                className="inline-flex min-h-11 items-center rounded-xl bg-amber-500 px-3 py-2 text-[11px] font-semibold text-slate-950 transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-amber-400 dark:hover:bg-amber-300 motion-reduce:transition-none"
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
        <div className={`mt-3 rounded-2xl p-3 text-xs ${isSuccess ? "bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200" : "bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <HelpCircle className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
              <span>{action.summary}</span>
            </div>
            {isSuccess && (
              <button
                type="button"
                onClick={() => onActionExecute && onActionExecute({ type: "open_quiz", data })}
                className="inline-flex min-h-11 items-center rounded-xl bg-sky-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-sky-500 dark:hover:bg-sky-400 motion-reduce:transition-none"
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
        strong: ({ children }) => <strong className="font-semibold text-slate-950 dark:text-white">{children}</strong>,
        a: ({ href, children }) => (
          <a href={sanitizeUrl(href)} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-emerald-300">
            {children}
          </a>
        ),
        code: ({ inline, children, className, ...props }) => {
          const codeValue = String(children).replace(/\n$/, "");
          if (inline) {
            return <code className="rounded-xl bg-slate-200 px-2 py-1 font-mono text-[11px] text-slate-800 dark:bg-slate-800 dark:text-slate-100" {...props}>{children}</code>;
          }

          return (
            <div className="relative my-2 overflow-hidden rounded-xl bg-slate-950 text-slate-100">
              <div className="flex items-center justify-between bg-slate-900 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-slate-300">
                <span>{className?.replace("language-", "") || "code"}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(codeValue)}
                  aria-label="Copy code"
                  className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-slate-800 px-3 py-2 text-[10px] font-medium text-slate-200 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70"
                >
                  {copyState[codeValue.slice(0, 32)] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
            <table className="w-full border-collapse text-left text-xs">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="bg-slate-100 p-2 font-semibold dark:bg-slate-800">{children}</th>,
        td: ({ children }) => <td className="p-2">{children}</td>,
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
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              <span>Lumo</span>
            </div>

            <div className="relative max-w-[90%] break-words rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
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
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/70 motion-reduce:transition-none"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry message
                  </button>
                </div>
              )}

              <div className="pointer-events-none mt-2 flex justify-end gap-1 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 motion-reduce:transition-none">
                <button
                  type="button"
                  aria-label="Copy Lumo message"
                  onClick={() => handleCopy(bubbleText)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white"
                >
                  {copyState[bubbleText.slice(0, 32)] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
                {onRetry && (
                  <button
                    type="button"
                    aria-label="Regenerate Lumo response"
                    onClick={onRetry}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white"
                  >
                    <RefreshCw className="h-4 w-4" />
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
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => handleSelectPrompt("Let's go through the questions I missed.")}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-[11px] font-bold text-sky-800 transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-sky-950/60 dark:text-sky-200 motion-reduce:transition-none"
                >
                  <HelpCircle className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  Review my mistakes
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-end gap-3">
        <div className="min-w-0 max-w-[80%] text-right">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">You</div>
          <div className="inline-block max-w-full break-words rounded-2xl bg-emerald-600 p-3 text-left text-sm leading-6 text-white dark:bg-emerald-500">
            {message.text}
          </div>
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

  const filteredPrompts = getPromptsByCategory(selectedCategory);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="flex h-full w-full max-w-full flex-col bg-white transition dark:bg-[#18211f] motion-reduce:transition-none"
        style={{
          width: mode === "fullpage" ? "100%" : typeof width === "number" ? `${width}px` : width,
          maxWidth: "100vw",
        }}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 p-3 pt-[max(1rem,env(safe-area-inset-top))] dark:border-slate-800 dark:bg-[#18211f] sm:p-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              title="Back"
              aria-label="Back"
              onClick={onClose}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <LumoAvatar size="sm" state={lumoState} className="shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Lumo</h2>
                <button
                  type="button"
                  onClick={() => setIsModeSwitcherOpen(true)}
                  title="Switch strictness mode"
                  aria-label="Switch strictness mode"
                  className="hidden h-11 items-center justify-center gap-1 rounded-xl bg-emerald-100 px-2 text-[10px] font-bold text-emerald-800 transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-emerald-950/80 dark:text-emerald-300 sm:inline-flex"
                >
                  <SlidersHorizontal className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">{currentModeLabel}</span>
                </button>
              </div>
              <p className="hidden text-[11px] text-slate-500 dark:text-slate-400 sm:block">Your AI study partner</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              title="Prompts menu"
              aria-label="Prompts menu"
              onClick={() => setIsPromptsSheetOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-emerald-950/60 dark:text-emerald-300 sm:h-11 sm:w-auto sm:gap-1 sm:px-3 sm:text-xs sm:font-semibold"
            >
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Prompts</span>
            </button>
            <button
              type="button"
              title="Clear conversation"
              aria-label="Clear conversation"
              onClick={onClear}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <Eraser className="h-4 w-4" />
            </button>
            {mode === "popout" ? (
              <button
                type="button"
                title="Expand to full page"
                aria-label="Expand to full page"
                onClick={() => setMode && setMode("fullpage")}
                className="hidden h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 md:inline-flex"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            ) : mode === "fullpage" ? (
              <button
                type="button"
                title="Return to pop-out chat"
                aria-label="Return to pop-out chat"
                onClick={() => setMode && setMode("popout")}
                className="hidden h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 md:inline-flex"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              title="Close Lumo"
              aria-label="Close Lumo"
              onClick={onClose}
              className="hidden h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 md:inline-flex"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Close AI tutor"
              aria-label="Close AI tutor"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:hover:bg-slate-800 dark:hover:text-slate-200 md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex w-full items-center justify-between gap-2 sm:hidden">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Your AI study partner</span>
            <button
              type="button"
              onClick={() => setIsModeSwitcherOpen(true)}
              aria-label={`Tutor mode: ${currentModeLabel}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Tutor mode
            </button>
          </div>
        </div>

        {/* Messages / Empty State Container */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 lg:p-6" role="log" aria-live="polite">
          <div className={`mx-auto w-full space-y-4 ${mode === "fullpage" ? "max-w-3xl" : ""}`}>
            {messages.length === 0 && !isTyping && (
              <div className="flex min-h-full items-center justify-center pt-2">
                <div className="w-full max-w-md rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-900">
                  <div className="relative mx-auto mb-3 flex items-center justify-center">
                    <LumoAvatar size="lg" state="thinking" className="relative z-10 motion-safe:animate-lumo-gentle-float" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{getLumoGreeting(profile)}</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Tap a prompt suggestion to start or ask anything.
                  </p>

                  <div className="mt-4 space-y-2 text-left">
                    <div className="flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <span>Popular Prompts</span>
                      <button
                        type="button"
                        onClick={() => setIsPromptsSheetOpen(true)}
                        className="min-h-11 rounded-xl px-2 text-emerald-700 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-emerald-300"
                      >
                        See all ({LUMO_PROMPTS.length})
                      </button>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {FEATURED_PROMPTS.map((prompt) => (
                        <button
                          key={prompt.id}
                          type="button"
                          onClick={() => handleSelectPrompt(prompt.text)}
                          className="group relative flex min-h-11 min-w-[160px] max-w-[220px] shrink-0 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 motion-reduce:transition-none"
                        >
                          <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                            {prompt.label}
                          </span>
                          <span className="line-clamp-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                            {prompt.text}
                          </span>
                        </button>
                      ))}
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
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <span>Lumo is thinking</span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 motion-safe:animate-pulse dark:bg-slate-300" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 motion-safe:animate-pulse [animation-delay:120ms] dark:bg-slate-300" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 motion-safe:animate-pulse [animation-delay:240ms] dark:bg-slate-300" />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input & Active Conversation Quick Chips */}
        <div className="border-t border-slate-200 bg-slate-50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-[#18211f]">
          <div className={`mx-auto w-full ${mode === "fullpage" ? "max-w-3xl" : ""}`}>
            {messages.length > 0 && (
              <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setIsPromptsSheetOpen(true)}
                  className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-emerald-100 px-3 py-2 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-emerald-950 dark:text-emerald-200"
                >
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Prompts</span>
                </button>
                {FEATURED_PROMPTS.map((prompt) => (
                  <button
                    key={`quick-${prompt.id}`}
                    type="button"
                    onClick={() => handleSelectPrompt(prompt.text)}
                    className="min-h-11 shrink-0 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 motion-reduce:transition-none"
                  >
                    {prompt.label}: {prompt.text}
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-end gap-2 p-2">
                <label htmlFor="lumo-input" className="sr-only">Message Lumo</label>
                <textarea
                  id="lumo-input"
                  ref={textareaRef}
                  rows={1}
                  value={currentMessage}
                  onChange={(e) => onMessageChange && onMessageChange(e.target.value.slice(0, 4000))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (currentMessage.trim() && !isTyping) {
                        sendMessage();
                      }
                    }
                  }}
                  placeholder="Message Lumo..."
                  aria-label="Message Lumo"
                  className="min-h-11 max-h-[140px] min-w-0 flex-1 resize-none rounded-xl bg-transparent px-2 py-2 text-sm leading-5 text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={!currentMessage.trim() || isTyping}
                  aria-label="Send message"
                  title="Send message"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              {charCount > 3500 && (
                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  {charCount} / 4000
                </div>
              )}
              <div className="ml-auto text-[10px] text-slate-500 dark:text-slate-400">Lumo can make mistakes. Double-check important info.</div>
            </div>
          </div>
        </div>
      </div>

      <ResponsiveSheet
        isOpen={isModeSwitcherOpen}
        onClose={() => setIsModeSwitcherOpen(false)}
        title="AI Tutor Mode"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choose how Lumo helps you solve questions during your courses.
          </p>
          <div className="space-y-2">
            {[
              {
                value: "always_guide",
                label: "Always Guide First",
                description: "The tutor asks questions and gives you steps to try. It won't hand over the answer.",
              },
              {
                value: "hints_then_answer",
                label: "Hints Then Answer",
                description: "You get hints first, and the full answer if you're still stuck.",
              },
              {
                value: "direct_help",
                label: "Direct Help",
                description: "You get the answer and explanation right away.",
              },
            ].map((opt) => {
              const isSelected = strictness === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    updateStrictness(opt.value);
                    setIsModeSwitcherOpen(false);
                  }}
                  className={`min-h-11 w-full rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 motion-reduce:transition-none ${
                    isSelected
                      ? "bg-emerald-50 border-emerald-500 text-emerald-950 dark:bg-emerald-950/50 dark:border-emerald-500 dark:text-emerald-100 shadow-sm"
                      : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-sm">
                    <span>{opt.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{opt.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </ResponsiveSheet>

      <ResponsiveSheet
        isOpen={isPromptsSheetOpen}
        onClose={() => setIsPromptsSheetOpen(false)}
        title="Lumo Ready-Made Prompts"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tap any prompt to send or fill in the placeholders (e.g. <code className="rounded-xl bg-slate-100 px-1 py-1 text-slate-800 dark:bg-slate-800 dark:text-slate-200">[topic]</code>).
          </p>

          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`min-h-11 shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 motion-reduce:transition-none ${
                selectedCategory === "all"
                  ? "bg-emerald-600 text-white dark:bg-emerald-500"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              All Prompts
            </button>
            {LUMO_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-h-11 shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 motion-reduce:transition-none ${
                  selectedCategory === cat.id
                    ? "bg-emerald-600 text-white dark:bg-emerald-500"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {filteredPrompts.map((prompt) => {
              const needsFill = hasPlaceholder(prompt.text);
              return (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => handleSelectPrompt(prompt.text)}
                  className="group flex min-h-11 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 motion-reduce:transition-none"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      {prompt.label}
                    </span>
                    {needsFill && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-medium text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                        Fill blank
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {prompt.text}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </ResponsiveSheet>
    </>
  );
};

export default AITutorChat;
