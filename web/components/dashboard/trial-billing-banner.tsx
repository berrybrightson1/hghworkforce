"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { DismissibleCallout } from "@/components/ui/dismissible-callout";

type BillingSummary = {
  companyName: string;
  plan?: "TRIAL" | "STARTER_PAYROLL" | "STARTER_ATTENDANCE" | "PRO";
  locked: boolean;
  fullAccess: boolean;
  subscribed: boolean;
  trialEndsAt: string;
  msRemaining: number;
  trialDays: number;
  paymentProviderConfigured: boolean;
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0h";
  const h = Math.floor(ms / 3_600_000);
  if (h >= 48) return `${Math.ceil(ms / 86_400_000)} days`;
  if (h >= 1) return `${h}h`;
  return `${Math.max(1, Math.ceil(ms / 60_000))} min`;
}

export function TrialBillingBanner({ userRole }: { userRole: UserRole }) {
  const { selected, loading } = useCompany();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const warned24hRef = useRef(false);

  useEffect(() => {
    if (userRole === "SUPER_ADMIN") {
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
          plan: data.plan,
          locked: data.locked,
          fullAccess: data.fullAccess,
          subscribed: data.subscribed,
          trialEndsAt: data.trialEndsAt,
          msRemaining: data.msRemaining,
          trialDays: data.trialDays,
          paymentProviderConfigured: data.paymentProviderConfigured,
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

  useEffect(() => {
    if (userRole === "SUPER_ADMIN") return;
    if (!summary?.locked) return;
    if (pathname.startsWith("/dashboard/billing")) return;
    router.replace("/dashboard/billing?locked=1");
  }, [summary?.locked, pathname, router, userRole]);

  useEffect(() => {
    if (userRole === "SUPER_ADMIN") return;
    if (!summary || summary.subscribed || summary.locked) return;
    const ms = summary.msRemaining;
    if (ms <= 0 || ms > 24 * 60 * 60 * 1000) return;
    if (warned24hRef.current) return;
    const key = `hgh-trial-24h-${selected?.id}`;
    if (sessionStorage.getItem(key)) return;
    warned24hRef.current = true;
    sessionStorage.setItem(key, "1");
    toast.warning(
      `Free trial ends in ${formatRemaining(ms)}. Subscribe under Billing to keep full access for ${summary.companyName}.`,
    );
  }, [summary, selected?.id, toast, userRole]);

  if (!summary || userRole === "EMPLOYEE" || userRole === "SUPER_ADMIN") return null;

  if (summary.locked && pathname.startsWith("/dashboard/billing")) {
    return (
      <DismissibleCallout
        storageKey={`hgh-dismiss-billing-trial-ended-${selected?.id ?? "none"}`}
        className="mb-6 items-start rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      >
        <div className="flex gap-2" role="status">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
          <div>
            <p className="font-semibold text-amber-950">Trial ended — subscription required</p>
            <p className="mt-1 text-amber-900/90">
              This workspace no longer has active access. Complete subscription below (or ask your operator to set
              subscription to ACTIVE) to restore payroll, attendance, and the rest of the product.
            </p>
          </div>
        </div>
      </DismissibleCallout>
    );
  }

  if (summary.subscribed) return null;

  if (!summary.fullAccess) return null;

  const showTrialEndingBanner =
    summary.plan === "TRIAL" &&
    summary.msRemaining > 0 &&
    summary.msRemaining <= 24 * 60 * 60 * 1000;

  if (showTrialEndingBanner) {
    return (
      <DismissibleCallout
        storageKey={`hgh-dismiss-trial-ending-${selected?.id ?? "none"}`}
        className="mb-6 rounded-xl border border-hgh-gold/35 bg-hgh-navy px-4 py-3 text-sm text-white"
      >
        <div className="flex items-start gap-2.5">
          <span className="material-symbols-outlined text-hgh-gold" aria-hidden>
            schedule
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-hgh-gold">Your free trial ends today.</p>
            <p className="mt-1 text-white/85">
              Choose a plan to keep your data and access.
            </p>
            <Link
              href="/subscribe"
              className="mt-2 inline-flex rounded-md bg-hgh-gold/20 px-3 py-1.5 text-xs font-medium text-hgh-gold hover:bg-hgh-gold/30"
            >
              Choose a plan
            </Link>
          </div>
        </div>
      </DismissibleCallout>
    );
  }

  /* Active trial messaging lives in the sidebar trial card; keep only effects above. */
  return null;
}
