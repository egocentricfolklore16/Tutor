import { BellRing, CheckCheck, X } from "lucide-react";

function formatTime(value) {
  if (!value) return "just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function NotificationCenter({ notifications = [], onDismiss, onMarkAllRead, onClose }) {
  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/30 dark:bg-slate-950/60" onClick={onClose}>
      <aside
        className="notification-pane motion-dialog absolute right-0 top-0 h-full w-full max-w-md border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-slate-900 dark:text-slate-100 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Notifications</h2>
          </div>
          <button
            type="button"
            title="Close notifications"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {notifications.filter((item) => !item.read).length} unread
          </p>
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        </div>

        <div className="mt-4 space-y-3 overflow-y-auto pb-6">
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-5 text-sm text-slate-600 dark:text-slate-400">
              You are all caught up. Your next update will appear here.
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-2xl border p-4 ${
                  notification.read
                    ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200"
                    : "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-slate-900 dark:text-slate-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{notification.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{notification.body}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDismiss(notification.id)}
                    title="Dismiss notification"
                    className="rounded-lg p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  <span>{notification.type || "general"}</span>
                  <span>{formatTime(notification.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

export default NotificationCenter;
