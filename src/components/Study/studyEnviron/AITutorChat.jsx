import React, { useEffect, useRef } from "react";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Eraser,
  HelpCircle,
  Layers,
  ListTodo,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const AITutorChat = ({
  isOpen,
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

  useEffect(() => {
    if (messages.length > 0 || isTyping) {
      messagesEndRef.current?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "end",
      });
    }
  }, [messages, isTyping, reducedMotion]);

  const charCount = currentMessage.length;

  const ActionCard = ({ action }) => {
    if (!action) return null;
    const isSuccess = action.status === "success";

    if (action.type === "study_plan") {
      const data = action.data || {};
      return (
        <div className={`mt-2.5 rounded-xl border p-3.5 text-xs shadow-sm ${isSuccess ? "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <div className="flex items-center gap-2 font-bold text-sm mb-1.5">
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
        <div className={`mt-2.5 rounded-xl border p-3.5 text-xs shadow-sm ${isSuccess ? "border-sky-200 bg-sky-50/80 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200" : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <div className="flex items-center gap-2 font-bold text-sm mb-1.5">
            <Calendar className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
            <span>{action.summary}</span>
          </div>
          {isSuccess && (
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-slate-600 dark:text-slate-300">
              <div><Clock className="inline h-3 w-3 mr-1" />{data.date} at {data.time}</div>
              <div>Duration: {data.duration} min</div>
              <div>Focus: {data.focus}</div>
            </div>
          )}
        </div>
      );
    }

    if (action.type === "flashcards") {
      const data = action.data || {};
      return (
        <div className={`mt-2.5 rounded-xl border p-3.5 text-xs shadow-sm ${isSuccess ? "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200" : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Layers className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{action.summary}</span>
            </div>
            {isSuccess && (
              <button
                type="button"
                onClick={() => onActionExecute && onActionExecute({ type: "open_flashcards" })}
                className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700 transition"
              >
                Open Flashcards
              </button>
            )}
          </div>
        </div>
      );
    }

    if (action.type === "quiz") {
      const data = action.data || {};
      return (
        <div className={`mt-2.5 rounded-xl border p-3.5 text-xs shadow-sm ${isSuccess ? "border-purple-200 bg-purple-50/80 text-purple-900 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-200" : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <HelpCircle className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
              <span>{action.summary}</span>
            </div>
            {isSuccess && (
              <button
                type="button"
                onClick={() => onActionExecute && onActionExecute({ type: "open_quiz", data })}
                className="rounded-lg bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-purple-700 transition"
              >
                Start Quizicle
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

      return (
        <div className="flex gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white ${isError ? "bg-rose-600" : theme?.accentButton || "bg-indigo-600"}`}>
            {isError ? <AlertCircle className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">AI Tutor</div>
            <div
              className={`rounded-2xl rounded-tl-sm p-3.5 text-sm leading-6 shadow-sm border ${
                isError
                  ? "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200"
                  : "bg-slate-100 border-slate-200/80 text-slate-900 dark:bg-[#1f2c28] dark:border-slate-800 dark:text-slate-100"
              }`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 leading-normal">{children}</p>,
                  ul: ({ children }) => <ul className="mb-2 list-disc pl-4 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-2 list-decimal pl-4 space-y-1">{children}</ol>,
                  li: ({ children }) => <li>{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-slate-950 dark:text-white">{children}</strong>,
                  code: ({ inline, className, children, ...props }) => {
                    return inline ? (
                      <code className="rounded bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 text-xs font-mono">{children}</code>
                    ) : (
                      <pre className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100 font-mono">
                        <code>{children}</code>
                      </pre>
                    );
                  },
                  table: ({ children }) => (
                    <div className="my-2 overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse border border-slate-300 dark:border-slate-700">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => <th className="border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 p-1.5 font-bold">{children}</th>,
                  td: ({ children }) => <td className="border border-slate-300 dark:border-slate-700 p-1.5">{children}</td>,
                }}
              >
                {message.text}
              </ReactMarkdown>

              {isError && onRetry && (
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry message
                  </button>
                </div>
              )}
            </div>

            {/* Display tool action cards if present */}
            {Array.isArray(message.actions) && message.actions.length > 0 && (
              <div className="space-y-2">
                {message.actions.map((act, i) => (
                  <ActionCard key={i} action={act} />
                ))}
              </div>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex gap-3 justify-end">
          <div className="flex-1 text-right min-w-0">
            <div className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">You</div>
            <div className={`inline-block rounded-2xl rounded-tr-sm p-3.5 text-left text-sm leading-6 text-white shadow-sm ${theme?.accentButton || "bg-indigo-600"}`}>
              {message.text}
            </div>
          </div>
          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt={user?.name || "You"} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </span>
            )}
          </div>
        </div>
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="flex h-full w-[min(92vw,400px)] flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-[#18211f] shadow-2xl transition-all"
      style={{ width: typeof width === "number" ? `${width}px` : width, maxWidth: "92vw" }}
    >
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1f2c28] p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${theme?.accentButton || "bg-indigo-600"}`}>
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">AI Tutor</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Groq Socratic Companion</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Clear conversation"
            aria-label="Clear conversation"
            onClick={onClear}
            className="rounded-lg p-2 text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <Eraser className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Close AI tutor"
            aria-label="Close AI tutor"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 lg:p-5" role="log" aria-live="polite">
        {messages.length === 0 && !isTyping && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#1f2c28] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Socratic AI Tutor Ready
            </div>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              Ask for guidance on a concept, schedule a study session, or request practice questions!
            </p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className={`h-2 w-2 rounded-full ${reducedMotion ? "" : "animate-pulse"} ${theme?.accentBg || "bg-emerald-500"}`} />
            Hyper Tutor is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1f2c28] p-4">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => onMessageChange && onMessageChange("Help me make a study plan")}
            className="whitespace-nowrap rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600"
          >
            Make a study plan
          </button>
          <button
            type="button"
            onClick={() => onMessageChange && onMessageChange("Schedule a study session for tomorrow")}
            className="whitespace-nowrap rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600"
          >
            Schedule session
          </button>
          <button
            type="button"
            onClick={() => onMessageChange && onMessageChange("Test my understanding with practice questions")}
            className="whitespace-nowrap rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600"
          >
            Request practice questions
          </button>
        </div>
        <div className="relative">
          <div className="flex items-end gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 focus-within:ring-2 focus-within:ring-emerald-500/20">
            <label htmlFor="ai-tutor-input" className="sr-only">Message AI Tutor</label>
            <textarea
              id="ai-tutor-input"
              rows={1}
              value={currentMessage}
              onChange={(e) => onMessageChange && onMessageChange(e.target.value.slice(0, 4000))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (currentMessage.trim() && !isTyping) onSendMessage && onSendMessage();
                }
              }}
              placeholder="Ask AI Tutor..."
              className="min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={onSendMessage}
              disabled={!currentMessage.trim() || isTyping}
              className={`rounded-lg p-2 text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${theme?.accentButton || "bg-indigo-600"}`}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {charCount > 3500 && (
            <div className="mt-1 text-right text-[10px] font-mono text-slate-400">
              {charCount} / 4000
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AITutorChat;
