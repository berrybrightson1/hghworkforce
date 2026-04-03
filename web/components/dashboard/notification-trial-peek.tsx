"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";
import { Timer } from "lucide-react";
import {
  TRIAL_ENDING_NOTIFICATION_MESSAGE,
  TRIAL_ENDING_NOTIFICATION_TITLE,
} from "@/lib/trial-ending-notification";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

type NotificationsResponse = {
  notifications: { id: string; title: string; isRead: boolean }[];
};

const PEEK_VISIBLE_MS = 4500;
const SETTLE_MS = 520;

export function NotificationTrialPeek({
  userRole,
  notificationsOpen,
  onOpenNotifications,
}: {
  userRole: UserRole;
  notificationsOpen: boolean;
  onOpenNotifications: () => void;
}) {
  const { selected } = useCompany();
  const shouldShow = userRole !== "EMPLOYEE";
  const apiUrl = shouldShow && selected ? `/api/admin-notifications?companyId=${selected.id}` : null;
  const { data } = useApi<NotificationsResponse>(apiUrl, { refreshInterval: 30_000 });

  const trialUnread = data?.notifications?.find(
    (n) => !n.isRead && n.title === TRIAL_ENDING_NOTIFICATION_TITLE,
  );

  const [phase, setPhase] = useState<"idle" | "in" | "shown" | "out">("idle");
  const ranForIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (notificationsOpen) {
      setPhase("idle");
      return;
    }
    if (!trialUnread) {
      ranForIdRef.current = null;
      setPhase("idle");
      return;
    }
    if (ranForIdRef.current === trialUnread.id) return;
    ranForIdRef.current = trialUnread.id;
    setPhase("in");
    const t1 = window.setTimeout(() => setPhase("shown"), 40);
    const t2 = window.setTimeout(() => setPhase("out"), PEEK_VISIBLE_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [trialUnread?.id, notificationsOpen]);

  useEffect(() => {
    if (phase !== "out") return;
    const t = window.setTimeout(() => setPhase("idle"), SETTLE_MS + 80);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (!trialUnread || phase === "idle") return null;

  return (
    <div
      className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-[min(17rem,calc(100vw-2rem))]"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={() => onOpenNotifications()}
        className={cn(
          "pointer-events-auto w-full origin-top-right rounded-xl border border-hgh-gold/35 bg-hgh-navy px-3 py-2.5 text-left shadow-lg shadow-hgh-navy/20 transition-all duration-500 ease-out",
          phase === "in" && "translate-y-2 scale-95 opacity-0",
          phase === "shown" && "translate-y-0 scale-100 opacity-100",
          phase === "out" && "-translate-y-1 scale-[0.96] opacity-0",
        )}
        style={{ transitionDuration: phase === "out" ? `${SETTLE_MS}ms` : undefined }}
      >
        <div className="flex items-start gap-2">
          <Timer size={20} className="shrink-0 text-hgh-gold" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-hgh-gold">{TRIAL_ENDING_NOTIFICATION_TITLE}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-white/85">{TRIAL_ENDING_NOTIFICATION_MESSAGE}</p>
            <Link
              href="/subscribe"
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-flex rounded-md bg-hgh-gold/20 px-2 py-1 text-[10px] font-medium text-hgh-gold hover:bg-hgh-gold/30"
            >
              Choose a plan
            </Link>
          </div>
        </div>
      </button>
    </div>
  );
}
