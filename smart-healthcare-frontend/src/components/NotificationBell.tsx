import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notificationService";
import type { AppNotification } from "../types/patient";

function IconBell({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

const PANEL_WIDTH = 320;

export function NotificationBell({ dark = false }: { dark?: boolean }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Checks the counter every 30s — no websocket, but sufficient
  // to give a "real-time" feel without additional infrastructure.
  useEffect(() => {
    function refreshCount() {
      getUnreadCount()
        .then(setUnreadCount)
        .catch(() => {});
    }
    refreshCount();
    const interval = setInterval(refreshCount, 30000);
    return () => clearInterval(interval);
  }, []);

  function computePosition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Aligns the panel under the bell, keeping it within the screen (especially
    // useful when the bell is near the left edge, in the sidebar).
    const left = Math.min(
      Math.max(rect.left, 8),
      window.innerWidth - PANEL_WIDTH - 8
    );
    setPanelPos({ top: rect.bottom + 8, left });
  }

  // The panel is rendered via a portal in <body> (position: fixed), so
  // it never gets clipped by an overflow parent (e.g., a scrollable sidebar).
  useEffect(() => {
    if (!open) return;
    computePosition();

    function handleReposition() {
      computePosition();
    }
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
      document.removeEventListener("mousedown", handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      getNotifications()
        .then(setNotifications)
        .finally(() => setLoading(false));
    }
  }

  async function handleNotificationClick(n: AppNotification) {
    if (!n.isRead) {
      try {
        await markNotificationRead(n.id);
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        /* navigate anyway */
      }
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      /* silent */
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        aria-label="Notifications"
        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          dark ? "text-sage-light/90 hover:bg-white/10 hover:text-paper" : "text-ink-soft hover:bg-sand"
        }`}
      >
        <IconBell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-risk-critical px-1 text-[10px] font-semibold text-paper">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open &&
        panelPos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: panelPos.top, left: panelPos.left, width: PANEL_WIDTH }}
            className="z-[100] overflow-hidden rounded-2xl border border-sand-dark/60 bg-paper-raised shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-sand-dark/60 px-4 py-2.5">
              <span className="text-sm font-medium text-ink">Notifications</span>
              {notifications.some((n) => !n.isRead) && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-pine hover:text-pine-dark"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <p className="px-4 py-6 text-center text-sm text-ink-soft">Loading...</p>
              ) : notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-ink-soft">No notifications.</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`flex w-full items-start gap-2.5 border-b border-sand-dark/30 px-4 py-3 text-left last:border-0 hover:bg-sage-light/20 ${
                      !n.isRead ? "bg-sage-light/10" : ""
                    }`}
                  >
                    {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pine" />}
                    <div className={n.isRead ? "pl-4" : ""}>
                      <p className="text-sm font-medium text-ink">{n.title}</p>
                      <p className="mt-0.5 text-xs text-ink-soft">{n.message}</p>
                      <p className="mt-1 text-[11px] text-ink-soft/70">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-sand-dark/60 px-4 py-2.5 text-center text-xs font-medium text-pine hover:bg-sage-light/20 hover:text-pine-dark"
            >
              View all notifications →
            </Link>
          </div>,
          document.body
        )}
    </>
  );
}