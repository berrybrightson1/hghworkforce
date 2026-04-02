"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { useCompany } from "@/components/company-context";
import { cn } from "@/lib/utils";
import { TRIAL_DAYS } from "@/lib/billing/access";

type BillingSummary = {
  companyName: string;
  locked: boolean;
  fullAccess: boolean;
  subscribed: boolean;
  trialEndsAt: string;
  msRemaining: number;
  trialDays: number;
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0h";
  const h = Math.floor(ms / 3_600_000);
  if (h >= 48) return `${Math.ceil(ms / 86_400_000)} days`;
  if (h >= 1) return `${h}h`;
  return `${Math.max(1, Math.ceil(ms / 60_000))} min`;
}

const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

function trialPercentUsed(msRemaining: number): number {
  if (msRemaining <= 0) return 100;
  const used = 1 - msRemaining / TRIAL_MS;
  return Math.min(100, Math.max(0, Math.round(used * 100)));
}

function formatTrialEnd(d: Date): string {
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function SidebarTrialUsageCard({
  userRole,
  onNavigate,
}: {
  userRole: UserRole;
  onNavigate?: () => void;
}) {
  const { selected, loading } = useCompany();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  /** In-memory dismiss only — refresh or switching workspace shows the card again. */
  useEffect(() => {
    setDismissed(false);
  }, [selected?.id]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (userRole === "EMPLOYEE") {
      setSummary(null);
      return;
    }
    if (loading || !selected?.id) {
      setSummary(null);
      return;
    }

    let cancelled = false;
    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch(
          `/api/billing/summary?companyId=${encodeURIComponent(selected.id)}`,
          { signal: ac.signal },
        );
        const data = (await res.json()) as BillingSummary & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setSummary(null);
          return;
        }
        setSummary({
          companyName: data.companyName,
          locked: data.locked,
          fullAccess: data.fullAccess,
          subscribed: data.subscribed,
          trialEndsAt: data.trialEndsAt,
          msRemaining: data.msRemaining,
          trialDays: data.trialDays,
        });
      } catch {
        if (!cancelled) setSummary(null);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [selected?.id, loading, userRole]);

  function dismiss() {
    setDismissed(true);
  }

  if (dismissed || !summary) return null;
  if (summary.subscribed || userRole === "SUPER_ADMIN") return null;

  if (summary.locked || !summary.fullAccess) {
    return (
      <div className="mx-2 mb-1 shrink-0 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-3">
        <p className="text-xs font-semibold text-amber-100">Subscription required</p>
        <p className="mt-1 text-[11px] leading-snug text-amber-50/90">
          This workspace needs an active plan. Open billing to restore access.
        </p>
        <Link
          href="/dashboard/billing"
          onClick={() => onNavigate?.()}
          className="mt-2 inline-block text-[11px] font-medium text-amber-200 underline underline-offset-2 hover:text-white"
        >
          Billing & subscribe
        </Link>
      </div>
    );
  }

  if (summary.msRemaining <= 0) return null;

  const end = new Date(summary.trialEndsAt);
  const ms = summary.msRemaining;
  const pct = trialPercentUsed(ms);
  const urgent = ms < 24 * 60 * 60 * 1000 || pct >= 80;

  return (
    <div
      className={cn(
        "relative mx-2 mb-1 shrink-0 rounded-xl border px-3 py-2.5 pr-7 pt-2",
        urgent
          ? "border-amber-400/50 bg-amber-500/10"
          : "border-hgh-gold/40 bg-hgh-gold/[0.06]",
      )}
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded text-white/35 transition hover:bg-white/10 hover:text-white/75"
        aria-label="Dismiss trial reminder"
      >
        <X className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
      </button>
      <div className="flex gap-2">
        <Clock
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0",
            urgent ? "text-amber-300" : "text-hgh-gold",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white">
            Free trial ({summary.trialDays} days) — full access
          </p>
          <p className="mt-1 text-[11px] leading-snug text-white/75">
            Workspace:{" "}
            <span className="font-medium text-white/90">{summary.companyName}</span>. Trial ends{" "}
            <time dateTime={end.toISOString()} className="text-white/85">
              {formatTrialEnd(end)}
            </time>
            {ms > 0 ? (
              <>
                {" "}
                (~{formatRemaining(ms)} left).
              </>
            ) : null}
          </p>
          <p className="mt-1 text-[10px] tabular-nums text-white/45">
            Your time: {now.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </p>
          <p className="sr-only">
            Trial about {pct} percent elapsed; ends {formatTrialEnd(end)}; about {formatRemaining(ms)} remaining.
          </p>
          <div
            className={cn(
              "mt-2.5 h-1.5 overflow-hidden rounded-full",
              urgent ? "bg-amber-950/25" : "bg-white/10",
            )}
            aria-hidden
          >
            <div
              className={cn(
                "h-full max-w-full rounded-full transition-[width] duration-300",
                urgent ? "bg-amber-400" : "bg-hgh-gold",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <button
              type="button"
              onClick={dismiss}
              className="text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
            >
              Dismiss
            </button>
            <Link
              href="/dashboard/billing"
              onClick={() => onNavigate?.()}
              className={cn(
                "font-medium underline underline-offset-2",
                urgent ? "text-amber-200" : "text-hgh-gold",
              )}
            >
              Billing & subscribe
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
