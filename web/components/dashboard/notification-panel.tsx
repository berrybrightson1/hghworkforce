"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  Clock,
  Landmark,
  Banknote,
  UserPlus,
  ClipboardList,
  CreditCard,
  Info,
  CheckCheck,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

/* ─── Type config: icon + colour per notification type ────────────────────── */

const TYPE_CONFIG: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  LEAVE_REQUEST:          { icon: CalendarDays,  color: "text-emerald-600", bg: "bg-emerald-50" },
  ATTENDANCE_CORRECTION:  { icon: Clock,         color: "text-sky-600",     bg: "bg-sky-50" },
  LOAN_REQUEST:           { icon: Landmark,      color: "text-amber-600",   bg: "bg-amber-50" },
  PAY_RUN_COMPLETED:      { icon: Banknote,      color: "text-green-600",   bg: "bg-green-50" },
  EMPLOYEE_JOINED:        { icon: UserPlus,      color: "text-indigo-600",  bg: "bg-indigo-50" },
  ONBOARDING_UPDATE:      { icon: ClipboardList, color: "text-violet-600",  bg: "bg-violet-50" },
  BILLING_ALERT:          { icon: CreditCard,    color: "text-orange-600",  bg: "bg-orange-50" },
  SYSTEM_NOTICE:          { icon: Info,          color: "text-blue-600",    bg: "bg-blue-50" },
};

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  actorName: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

/* ─── Single notification row ─────────────────────────────────────────────── */

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.SYSTEM_NOTICE;
  const Icon = config.icon;

  const inner = (
    <div
      className={cn(
        "group flex gap-3 px-4 py-3 transition-colors hover:bg-hgh-offwhite/80",
        !notification.isRead && "bg-hgh-gold/[0.04]",
      )}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!notification.isRead) onMarkRead(notification.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !notification.isRead) onMarkRead(notification.id);
      }}
    >
      {/* Icon */}
      <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", config.bg)}>
        <Icon size={16} className={config.color} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm leading-snug", !notification.isRead ? "font-semibold text-hgh-navy" : "font-medium text-hgh-navy/80")}>
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-hgh-gold" aria-label="Unread" />
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-hgh-muted">
          {notification.message}
        </p>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-hgh-muted/70">
          <span>{relativeTime(notification.createdAt)}</span>
          {notification.actorName && (
            <>
              <span className="text-hgh-border">·</span>
              <span className="truncate">{notification.actorName}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (notification.linkUrl) {
    return (
      <Link href={notification.linkUrl} className="block outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-hgh-gold/40">
        {inner}
      </Link>
    );
  }

  return inner;
}

/* ─── Empty state ─────────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-hgh-offwhite text-hgh-muted">
        <Bell className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-medium text-hgh-navy">All caught up</p>
      <p className="mt-1 text-xs text-hgh-muted">No notifications yet. Activity from your workspace will appear here.</p>
    </div>
  );
}

/* ─── Main panel ──────────────────────────────────────────────────────────── */

export function NotificationPanel({ userRole }: { userRole: UserRole }) {
  const { selected } = useCompany();
  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const shouldShow = userRole !== "EMPLOYEE";
  const apiUrl = shouldShow && selected ? `/api/admin-notifications?companyId=${selected.id}` : null;

  const { data, mutate } = useApi<NotificationsResponse>(apiUrl, {
    refreshInterval: 30_000,
  });

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  const todayItems = notifications.filter((n) => isToday(n.createdAt));
  const earlierItems = notifications.filter((n) => !isToday(n.createdAt));

  const markRead = useCallback(
    async (id: string) => {
      // Optimistic update
      mutate(
        (prev) =>
          prev
            ? {
                ...prev,
                unreadCount: Math.max(0, prev.unreadCount - 1),
                notifications: prev.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
              }
            : prev,
        false,
      );
      await fetch("/api/admin-notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      mutate();
    },
    [mutate],
  );

  const markAllRead = useCallback(async () => {
    if (!selected || markingAll) return;
    setMarkingAll(true);
    // Optimistic update
    mutate(
      (prev) =>
        prev
          ? {
              ...prev,
              unreadCount: 0,
              notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
            }
          : prev,
      false,
    );
    await fetch("/api/admin-notifications/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true, companyId: selected.id }),
    });
    mutate();
    setMarkingAll(false);
  }, [selected, mutate, markingAll]);

  if (!shouldShow) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-hgh-border bg-white text-hgh-muted transition-colors hover:bg-hgh-offwhite hover:text-hgh-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold/40"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-hgh-gold px-1 text-[10px] font-bold leading-none text-white shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-[min(24rem,calc(100vw-2rem))] overflow-hidden p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hgh-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold text-hgh-navy">Notifications</h3>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-hgh-gold transition-colors hover:bg-hgh-gold/10 disabled:opacity-50"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[min(28rem,60vh)] overflow-y-auto overscroll-contain">
          {notifications.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {todayItems.length > 0 && (
                <div>
                  <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-hgh-muted/60">
                    Today
                  </p>
                  <div className="divide-y divide-hgh-border/30">
                    {todayItems.map((n) => (
                      <NotificationRow key={n.id} notification={n} onMarkRead={markRead} />
                    ))}
                  </div>
                </div>
              )}

              {earlierItems.length > 0 && (
                <div>
                  <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-hgh-muted/60">
                    Earlier
                  </p>
                  <div className="divide-y divide-hgh-border/30">
                    {earlierItems.map((n) => (
                      <NotificationRow key={n.id} notification={n} onMarkRead={markRead} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-hgh-border/60">
          <Link
            href="/dashboard/inbox"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-hgh-muted transition-colors hover:bg-hgh-offwhite hover:text-hgh-navy"
          >
            <Inbox size={14} />
            View full inbox
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
