import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notificationService";
import type { AppNotification } from "../types/patient";

type Filter = "all" | "unread";

const typeLabel: Record<string, string> = {
  appointment: "Appointment",
  clinical_note: "Medical note",
};

const typeStyle: Record<string, string> = {
  appointment: "bg-sage-light text-pine-dark",
  clinical_note: "bg-brass/15 text-brass",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    getNotifications()
      .then(setNotifications)
      .finally(() => setLoading(false));
  }

  const filtered = useMemo(
    () => (filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications),
    [notifications, filter]
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleClick(n: AppNotification) {
    if (!n.isRead) {
      try {
        await markNotificationRead(n.id);
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      } catch {
        /* navigate anyway */
      }
    }
    if (n.link) navigate(n.link);
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      /* silent */
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-widest text-brass">Tracking</span>
          <h1 className="font-display text-4xl text-pine">Notifications</h1>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm font-medium text-pine hover:text-pine-dark"
          >
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      <div className="mb-5 inline-flex rounded-full border border-sand-dark/60 bg-paper-raised p-1">
        {(["all", "unread"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f ? "bg-pine text-paper" : "text-ink-soft hover:text-pine"
            }`}
          >
            {f === "all" ? "All" : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ink-soft">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand-dark bg-paper-raised px-8 py-16 text-center">
          <p className="text-ink-soft">
            {filter === "unread" ? "No unread notifications." : "No notifications at the moment."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-sand-dark/60 bg-paper-raised shadow-sm">
          {filtered.map((n, i) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-sage-light/20 ${
                i > 0 ? "border-t border-sand-dark/40" : ""
              } ${!n.isRead ? "bg-sage-light/10" : ""}`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  n.isRead ? "bg-transparent" : "bg-pine"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{n.title}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      typeStyle[n.type] ?? "bg-sand text-ink-soft"
                    }`}
                  >
                    {typeLabel[n.type] ?? n.type}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{n.message}</p>
                <p className="mt-1.5 font-mono text-xs text-ink-soft/70">
                  {formatDateTime(n.createdAt)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}