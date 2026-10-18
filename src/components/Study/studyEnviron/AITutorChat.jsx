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

  const panelAccent = theme?.accentButton || "bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600";

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

    if (hasPlaceholder(promptText)) {
      if (onMessageChange) {
        onMessageChange(promptText);
      }
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const match = /\[.*?\]/.exec(promptText);
          if (match) {
            textareaRef.current.setSelectionRange(match.index, match.index + match[0].length);
          } else {
            textareaRef.current.setSelectionRange(promptText.length, promptText.length);
          }
        }
      }, 50);
    } else {
      if (onMessageChange) {
        onMessageChange(promptText);
      }
      setTimeout(() => {
        if (onSendMessage) {
          onSendMessage(promptText);
        }
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
        <div className={`mt-2.5 rounded-2xl p-3 text-xs shadow-surface ${isSuccess ? "bg-emerald-50/80 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" : "bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
            <ListTodo className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{action.summary}</span>
          </div>
          {isSuccess && Array.isArray(data.milestones) && (
            <div className="mt-2 space-y-1.5 pt-2">
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
        <div className={`mt-2.5 rounded-2xl p-3 text-xs shadow-surface ${isSuccess ? "bg-sky-50/80 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200" : "bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
            <Calendar className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
            <span>{action.summary}</span>
          </div>
          {isSuccess && (
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-slate-600 dark:text-slate-300">
              <div><Clock className="mr-1 inline h-3 w-3" />{data.date} at {data.time}</div>
              <div>Duration: {data.duration} min</div>
              <div>Focus: {data.focus}</div>
            </div>
          )}
        </div>
      );
    }

    if (action.type === "flashcards") {
      return (
        <div className={`mt-2.5 rounded-2xl p-3 text-xs shadow-surface ${isSuccess ? "bg-amber-50/80 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" : "bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{action.summary}</span>
            </div>
            {isSuccess && (
              <button
                type="button"
                onClick={() => onActionExecute && onActionExecute({ type: "open_flashcards" })}
                className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-button-primary transition hover:bg-amber-700"
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
        <div className={`mt-2.5 rounded-2xl p-3 text-xs shadow-surface ${isSuccess ? "bg-violet-50/80 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200" : "bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <HelpCircle className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
              <span>{action.summary}</span>
            </div>
            {isSuccess && (
              <button
                type="button"
                onClick={() => onActionExecute && onActionExecute({ type: "open_quiz", data })}
                className="rounded-lg bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-button-primary transition hover:bg-violet-700"
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
          <a href={sanitizeUrl(href)} target="_blank" rel="noopener noreferrer" className="font-medium text-violet-600 underline underline-offset-2 dark:text-violet-300">
            {children}
          </a>
        ),
        code: ({ inline, children, className, ...props }) => {
          const codeValue = String(children).replace(/\n$/, "");
          if (inline) {
            return <code className="rounded-md bg-slate-200 px-1.5 py-0.5 font-mono text-[11px] text-slate-800 dark:bg-slate-800 dark:text-slate-100" {...props}>{children}</code>;
          }

          return (
            <div className="relative my-2 overflow-hidden rounded-xl bg-slate-950 text-slate-100 shadow-surface">
              <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-300">
                <span>{className?.replace("language-", "") || "code"}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(codeValue)}
                  aria-label="Copy code"
                  className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-200 shadow-surface transition hover:text-white"
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
            <table className="w-full border-collapse text-left text-xs shadow-surface">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="bg-slate-100 p-1.5 font-semibold dark:bg-slate-800">{children}</th>,
        td: ({ children }) => <td className="p-1.5">{children}</td>,
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

            <div className="relative max-w-[90%] rounded-2xl rounded-tl-md bg-white/80 p-3 text-sm leading-6 text-slate-800 shadow-surface dark:bg-slate-900/80 dark:text-slate-100">
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
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-button-primary transition hover:bg-rose-700"
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
                  className="rounded-full bg-white p-1.5 text-slate-600 shadow-overlay transition hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white"
                >
                  {copyState[bubbleText.slice(0, 32)] ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                {onRetry && (
                  <button
                    type="button"
                    aria-label="Regenerate Lumo response"
                    onClick={onRetry}
                    className="rounded-full bg-white p-1.5 text-slate-600 shadow-overlay transition hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white"
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
                  onClick={() => handleSelectPrompt("Let's go through the questions I missed.")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-800 shadow-surface transition hover:bg-violet-100 dark:bg-violet-950/60 dark:text-violet-200"
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

    return (
      <div className="flex justify-end gap-3">
        <div className="min-w-0 max-w-[80%] text-right">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">You</div>
          <div className={`inline-block rounded-2xl rounded-tr-md p-3.5 text-left text-sm leading-6 text-white shadow-surface ${panelAccent}`}>
            {message.text}
          </div>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200 shadow-surface">
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
        className="flex h-full w-full max-w-full flex-col bg-white shadow-overlay transition-all duration-200 dark:bg-[#101826]"
        style={{
          width: mode === "fullpage" ? "100%" : typeof width === "number" ? `${width}px` : width,
          maxWidth: "100vw",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-50/90 p-4 pt-[max(1rem,env(safe-area-inset-top))] dark:bg-[#151f2d]/90 shadow-surface">
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
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Lumo</h2>
                <button
                  type="button"
                  onClick={() => setIsModeSwitcherOpen(true)}
                  title="Switch strictness mode"
                  aria-label="Switch strictness mode"
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2 py-0.5 text-[10px] font-bold text-emerald-800 transition hover:bg-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 min-h-[28px]"
                >
                  <SlidersHorizontal className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  <span>{currentModeLabel}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Your AI study partner</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Prompts menu"
              aria-label="Prompts menu"
              onClick={() => setIsPromptsSheetOpen(true)}
              className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 shadow-surface transition hover:bg-violet-100 dark:bg-violet-950/60 dark:text-violet-300 min-h-[36px]"
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              <span>Prompts</span>
            </button>
            <button
              type="button"
              title="Clear conversation"
              aria-label="Clear conversation"
              onClick={onClear}
              className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 focus:outline-none focus:shadow-focus dark:hover:bg-slate-800 dark:hover:text-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Eraser className="h-4 w-4" />
            </button>
            {mode === "popout" ? (
              <button
                type="button"
                title="Expand to full page"
                aria-label="Expand to full page"
                onClick={() => setMode && setMode("fullpage")}
                className="hidden rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 focus:outline-none focus:shadow-focus dark:hover:bg-slate-800 dark:hover:text-slate-200 md:inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            ) : mode === "fullpage" ? (
              <button
                type="button"
                title="Return to pop-out chat"
                aria-label="Return to pop-out chat"
                onClick={() => setMode && setMode("popout")}
                className="hidden rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 focus:outline-none focus:shadow-focus dark:hover:bg-slate-800 dark:hover:text-slate-200 md:inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              title="Close Lumo"
              aria-label="Close Lumo"
              onClick={onClose}
              className="hidden rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 focus:outline-none focus:shadow-focus dark:hover:bg-slate-800 dark:hover:text-slate-200 md:inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Close AI tutor"
              aria-label="Close AI tutor"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:shadow-focus dark:hover:bg-slate-800 dark:hover:text-slate-200 md:hidden min-h-[44px] min-w-[44px]"
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
                <div className="w-full max-w-md rounded-[28px] bg-slate-50/80 p-5 sm:p-6 text-center shadow-surface dark:bg-slate-900/80">
                  <div className="relative mx-auto mb-3 flex items-center justify-center">
                    <div className="absolute h-20 w-20 rounded-full bg-emerald-500/20 blur-xl dark:bg-emerald-400/20" aria-hidden="true" />
                    <LumoAvatar size="lg" state="thinking" className="relative z-10 animate-lumo-gentle-float" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Hi, I'm Lumo. What are we studying?</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Tap a prompt suggestion to start or ask anything.
                  </p>

                  <div className="mt-4 space-y-2 text-left">
                    <div className="flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <span>Popular Prompts</span>
                      <button
                        type="button"
                        onClick={() => setIsPromptsSheetOpen(true)}
                        className="text-violet-600 transition hover:underline dark:text-violet-400"
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
                          className="group relative flex shrink-0 min-w-[160px] max-w-[220px] flex-col justify-between rounded-2xl bg-white p-3 text-left shadow-surface hover:shadow-surface-hover transition focus:outline-none focus:shadow-focus dark:bg-slate-800/90 min-h-[72px]"
                        >
                          <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
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
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md bg-white/80 px-3 py-2 text-sm text-slate-600 shadow-surface dark:bg-slate-900/80 dark:text-slate-300">
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
        <div className="bg-slate-50/90 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:bg-[#151f2d]/90 shadow-surface">
          <div className={`mx-auto w-full ${mode === "fullpage" ? "max-w-3xl" : ""}`}>
            {messages.length > 0 && (
              <div className="mb-2.5 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setIsPromptsSheetOpen(true)}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-violet-100/80 px-3 py-1.5 text-[11px] font-semibold text-violet-800 shadow-surface transition hover:bg-violet-200 dark:bg-violet-950 dark:text-violet-200 min-h-[36px]"
                >
                  <Sparkles className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                  <span>Prompts</span>
                </button>
                {FEATURED_PROMPTS.map((prompt) => (
                  <button
                    key={`quick-${prompt.id}`}
                    type="button"
                    onClick={() => handleSelectPrompt(prompt.text)}
                    className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-surface transition hover:shadow-surface-hover hover:text-violet-700 focus:outline-none focus:shadow-focus dark:bg-slate-800 dark:text-slate-200 min-h-[36px]"
                  >
                    {prompt.label}: {prompt.text}
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-[24px] bg-white shadow-inset-field transition focus-within:shadow-focus dark:bg-slate-800">
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
                      if (currentMessage.trim() && !isTyping && onSendMessage) {
                        onSendMessage();
                      }
                    }
                  }}
                  placeholder="Message Lumo..."
                  aria-label="Message Lumo"
                  className="min-h-[42px] max-h-[140px] min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => onSendMessage && onSendMessage()}
                  disabled={!currentMessage.trim() || isTyping}
                  aria-label="Send message"
                  title="Send message"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-button-primary transition focus:outline-none focus:shadow-focus disabled:cursor-not-allowed disabled:opacity-40 min-h-[44px] min-w-[44px] ${panelAccent}`}
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
            Choose how Lumo helps you solve questions during your study sessions.
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
                  className={`w-full rounded-2xl p-3.5 text-left transition border ${
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
            Tap any prompt to send or fill in the placeholders (e.g. <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200">[topic]</code>).
          </p>

          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition min-h-[36px] ${
                selectedCategory === "all"
                  ? "bg-violet-600 text-white dark:bg-violet-500 shadow-button-primary"
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
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition min-h-[36px] ${
                  selectedCategory === cat.id
                    ? "bg-violet-600 text-white dark:bg-violet-500 shadow-button-primary"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {filteredPrompts.map((prompt) => {
              const needsFill = hasPlaceholder(prompt.text);
              return (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => handleSelectPrompt(prompt.text)}
                  className="group flex flex-col justify-between rounded-2xl bg-white p-3.5 text-left shadow-surface hover:shadow-surface-hover transition focus:outline-none focus:shadow-focus dark:bg-slate-900/90 min-h-[80px]"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                      {prompt.label}
                    </span>
                    {needsFill && (
                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
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
