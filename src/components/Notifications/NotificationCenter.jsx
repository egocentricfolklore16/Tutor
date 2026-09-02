import { BellRing, CheckCheck, X } from "lucide-react";

function formatTime(value) {
  if (!value) return "just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function NotificationCenter({ notifications = [], onDismiss, onMarkAllRead, onClose }) {
  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/30" onClick={onClose}>
      <aside
        className="notification-pane absolute right-0 top-0 h-full w-full max-w-md border-l border-slate-200 bg-white p-6 text-black shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-black">Notifications</h2>
          </div>
          <button
            type="button"
            title="Close notifications"
            onClick={onClose}
            className="rounded-lg p-2 text-black hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-sm font-medium text-black">
            {notifications.filter((item) => !item.read).length} unread
          </p>
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        </div>

        <div className="mt-4 space-y-3 overflow-y-auto pb-6">
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-black">
              You are all caught up. Your next update will appear here.
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-2xl border p-4 ${
                  notification.read
                    ? "border-slate-200 bg-slate-50 text-black"
                    : "border-emerald-200 bg-emerald-50 text-black"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{notification.title}</p>
                    <p className="mt-1 text-sm leading-6">{notification.body}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDismiss(notification.id)}
                    title="Dismiss notification"
                    className="rounded-lg p-1 text-black hover:bg-white/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.08em] text-black">
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
