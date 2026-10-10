import React, { useEffect, useRef, useState } from "react";
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
  Send,
  X,
} from "lucide-react";
import LumoAvatar from "../../common/LumoAvatar";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const suggestionPrompts = [
  "Explain this topic",
  "Quiz me",
  "Break down a problem",
  "Make a study plan",
];

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
  const [copyState, setCopyState] = useState({});

  const panelAccent = theme?.accentButton || "bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600";

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
    if (mode !== "fullpage") return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (setMode) setMode("popout");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, setMode]);

  const charCount = currentMessage.length;

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

  const ActionCard = ({ action }) => {
    if (!action) return null;
    const isSuccess = action.status === "success";

    if (action.type === "study_plan") {
      const data = action.data || {};
      return (
        <div className={`mt-2.5 rounded-2xl border p-3 text-xs shadow-sm ${isSuccess ? "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
            <ListTodo className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{action.summary}</span>
          </div>
          {isSuccess && Array.isArray(data.milestones) && (
            <div className="mt-2 space-y-1.5 border-t border-emerald-200/60 pt-2 dark:border-emerald-800/60">
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
        <div className={`mt-2.5 rounded-2xl border p-3 text-xs shadow-sm ${isSuccess ? "border-sky-200 bg-sky-50/80 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200" : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"}`}>
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
        <div className={`mt-2.5 rounded-2xl border p-3 text-xs shadow-sm ${isSuccess ? "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200" : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{action.summary}</span>
            </div>
            {isSuccess && (
              <button
                type="button"
                onClick={() => onActionExecute && onActionExecute({ type: "open_flashcards" })}
                className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-amber-700"
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
        <div className={`mt-2.5 rounded-2xl border p-3 text-xs shadow-sm ${isSuccess ? "border-violet-200 bg-violet-50/80 text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200" : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <HelpCircle className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
              <span>{action.summary}</span>
            </div>
            {isSuccess && (
              <button
                type="button"
                onClick={() => onActionExecute && onActionExecute({ type: "open_quiz", data })}
                className="rounded-lg bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-violet-700"
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

  const MessageBubble = ({ message }) => {
    if (message.sender === "ai") {
      const isError = Boolean(message.isError);
      const bubbleText = String(message.text || "");

      return (
        <div className="group flex gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center">
            {isError ? (
              <AlertCircle className="h-5 w-5 text-rose-500" />
            ) : (
              <LumoAvatar size="xs" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              <span>Lumo</span>
            </div>

            <div className="relative max-w-[90%] rounded-2xl rounded-tl-md border border-slate-200 bg-white/80 p-3 text-sm leading-6 text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 leading-6">{children}</p>,
                  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-4">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-4">{children}</ol>,
                  li: ({ children }) => <li>{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-slate-950 dark:text-white">{children}</strong>,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-violet-600 underline underline-offset-2 dark:text-violet-300">
                      {children}
                    </a>
                  ),
                  code: ({ inline, children, className, ...props }) => {
                    const codeValue = String(children).replace(/\n$/, "");
                    if (inline) {
                      return <code className="rounded-md bg-slate-200 px-1.5 py-0.5 font-mono text-[11px] text-slate-800 dark:bg-slate-800 dark:text-slate-100" {...props}>{children}</code>;
                    }

                    return (
                      <div className="relative my-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 text-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-300">
                          <span>{className?.replace("language-", "") || "code"}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(codeValue)}
                            aria-label="Copy code"
                            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
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
                      <table className="w-full border-collapse border border-slate-300 text-left text-xs dark:border-slate-700">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => <th className="border border-slate-300 bg-slate-100 p-1.5 font-semibold dark:border-slate-700 dark:bg-slate-800">{children}</th>,
                  td: ({ children }) => <td className="border border-slate-300 p-1.5 dark:border-slate-700">{children}</td>,
                }}
              >
                {bubbleText}
              </ReactMarkdown>

              {isError && onRetry && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-rose-700"
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
                  className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
                >
                  {copyState[bubbleText.slice(0, 32)] ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                {onRetry && (
                  <button
                    type="button"
                    aria-label="Regenerate Lumo response"
                    onClick={onRetry}
                    className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
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
                  onClick={() => {
                    if (onMessageChange && onSendMessage) {
                      onMessageChange("Let's go through the questions I missed.");
                      setTimeout(() => onSendMessage("Let's go through the questions I missed."), 50);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-800 shadow-sm transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-200"
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
          <div className={`inline-block rounded-2xl rounded-tr-md p-3.5 text-left text-sm leading-6 text-white shadow-sm ${panelAccent}`}>
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

  if (!isOpen) return null;

  return (
    <div
      className="flex h-full w-full max-w-full flex-col border-l border-slate-200 bg-white shadow-2xl transition-all duration-200 dark:border-slate-800 dark:bg-[#101826]"
      style={{
        width: mode === "fullpage" ? "100%" : typeof width === "number" ? `${width}px` : width,
        maxWidth: "100vw",
      }}
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-[#151f2d]/90">
        <div className="flex items-center gap-3">
          <button
            type="button"
            title="Back"
            aria-label="Back"
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <LumoAvatar size="sm" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Lumo</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Your AI study partner</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Clear conversation"
            aria-label="Clear conversation"
            onClick={onClear}
            className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <Eraser className="h-4 w-4" />
          </button>
          {mode === "popout" ? (
            <button
              type="button"
              title="Expand to full page"
              aria-label="Expand to full page"
              onClick={() => setMode && setMode("fullpage")}
              className="hidden rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/60 dark:hover:bg-slate-800 dark:hover:text-slate-200 md:inline-flex"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          ) : mode === "fullpage" ? (
            <button
              type="button"
              title="Return to pop-out chat"
              aria-label="Return to pop-out chat"
              onClick={() => setMode && setMode("popout")}
              className="hidden rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/60 dark:hover:bg-slate-800 dark:hover:text-slate-200 md:inline-flex"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            title="Close Lumo"
            aria-label="Close Lumo"
            onClick={onClose}
            className="hidden rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/60 dark:hover:bg-slate-800 dark:hover:text-slate-200 md:inline-flex"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 lg:p-5" role="log" aria-live="polite">
        <div className={`mx-auto w-full space-y-4 ${mode === "fullpage" ? "max-w-3xl" : ""}`}>
          {messages.length === 0 && !isTyping && (
            <div className="flex min-h-full items-center justify-center pt-2">
              <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-slate-50/80 p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                <div className="relative mx-auto mb-4 flex items-center justify-center">
                  <div className="absolute h-20 w-20 rounded-full bg-emerald-500/20 blur-xl dark:bg-emerald-400/20" aria-hidden="true" />
                  <LumoAvatar size="lg" className="relative z-10 animate-lumo-gentle-float" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Hi, I'm Lumo. What are we studying?</h3>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {suggestionPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => onMessageChange && onMessageChange(prompt)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-violet-300 hover:text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-violet-500/60 dark:hover:text-violet-200"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <MessageBubble key={`${msg.sender}-${idx}`} message={msg} />
          ))}

          {isTyping && (
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center">
                <LumoAvatar size="xs" className="animate-lumo-head-tilt" />
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

      <div className="border-t border-slate-200 bg-slate-50/90 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-[#151f2d]/90">
        <div className={`mx-auto w-full ${mode === "fullpage" ? "max-w-3xl" : ""}`}>
          {messages.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {suggestionPrompts.map((prompt) => (
                <button
                  key={`quick-${prompt}`}
                  type="button"
                  onClick={() => onMessageChange && onMessageChange(prompt)}
                  className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:border-violet-300 hover:text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-violet-500/60 dark:hover:text-violet-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm transition focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800">
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
                onClick={onSendMessage}
                disabled={!currentMessage.trim() || isTyping}
                aria-label="Send message"
                title="Send message"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md transition focus:outline-none focus:ring-2 focus:ring-violet-500/60 disabled:cursor-not-allowed disabled:opacity-40 ${panelAccent}`}
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
  );
};

export default AITutorChat;
