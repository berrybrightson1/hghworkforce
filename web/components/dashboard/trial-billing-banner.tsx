"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { useCompany } from "@/components/company-context";
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

export function TrialBillingBanner({ userRole }: { userRole: UserRole }) {
  const { selected, loading } = useCompany();
  const pathname = usePathname();
  const router = useRouter();
  const [summary, setSummary] = useState<BillingSummary | null>(null);

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

  /* Trial-ending nudge: bell (ensureCompanyAttentionNotifications). */
  return null;
}
