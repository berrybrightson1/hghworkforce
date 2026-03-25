"use client";

import { useEffect, useState } from "react";
import { CreditCard, Sparkles } from "lucide-react";
import { useCompany } from "@/components/company-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/toast/useToast";

function formatCap(n: number) {
  if (n >= 1_000_000_000) return "Unlimited";
  return n.toLocaleString();
}

type Summary = {
  companyName: string;
  planTier: string;
  subscriptionStatus: string;
  billingEnforced: boolean;
  paymentProviderConfigured: boolean;
  accessBypassed: boolean;
  effectiveLabel: string;
  limits: { maxEmployeesPerCompany: number; maxPayrunsPerMonth: number };
  tierLimits: { maxEmployeesPerCompany: number; maxPayrunsPerMonth: number };
};

export default function BillingPage() {
  const { selected, loading } = useCompany();
  const { toast } = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (!selected?.id) {
      setSummary(null);
      setLoadingSummary(false);
      return;
    }

    let cancelled = false;
    setLoadingSummary(true);

    (async () => {
      try {
        const res = await fetch(
          `/api/billing/summary?companyId=${encodeURIComponent(selected.id)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          toast.error(data.error ?? "Could not load billing");
          setSummary(null);
          return;
        }
        setSummary(data);
      } catch {
        if (!cancelled) {
          toast.error("Could not load billing");
          setSummary(null);
        }
      } finally {
        if (!cancelled) setLoadingSummary(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected?.id, toast]);

  async function handleUpgrade() {
    if (!selected?.id) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: selected.id, targetTier: "GROWTH" }),
      });
      const data = await res.json();
      if (data.bypassed && data.message) {
        toast.success(data.message);
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? "Checkout unavailable");
        return;
      }
      toast.success("Redirecting to checkout…");
    } catch {
      toast.error("Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (loading || loadingSummary) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-40 animate-pulse rounded-xl border border-hgh-border bg-white" />
      </div>
    );
  }

  if (!selected) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <p className="mt-1 text-sm text-hgh-muted">
            Select a company in the sidebar to view plan and usage.
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-hgh-navy">Billing & plan</h2>
        <p className="mt-1 text-sm text-hgh-muted">
          Workspace: <span className="font-medium text-hgh-slate">{selected.name}</span>
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-hgh-navy/5">
            <CreditCard className="h-5 w-5 text-hgh-navy" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg">Current plan</CardTitle>
            <p className="mt-1 text-sm text-hgh-muted">
              Recorded tier: <span className="font-medium text-hgh-slate">{summary?.planTier ?? "—"}</span>
              {summary?.subscriptionStatus && summary.subscriptionStatus !== "NONE" ? (
                <>
                  {" "}
                  · Subscription:{" "}
                  <span className="font-medium text-hgh-slate">{summary.subscriptionStatus}</span>
                </>
              ) : null}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-hgh-border bg-hgh-offwhite/80 px-4 py-3">
            <p className="text-sm font-medium text-hgh-navy">{summary?.effectiveLabel ?? "—"}</p>
            <p className="mt-1 text-xs text-hgh-muted">
              {summary?.accessBypassed
                ? "Limits and payment are not enforced yet — you have full access while we finish billing integration."
                : `Up to ${formatCap(summary?.limits.maxEmployeesPerCompany ?? 0)} employees and ${formatCap(summary?.limits.maxPayrunsPerMonth ?? 0)} pay run(s) per month for this company.`}
            </p>
          </div>

          {summary && !summary.accessBypassed ? (
            <p className="text-xs text-hgh-muted">
              Tier caps: {formatCap(summary.tierLimits.maxEmployeesPerCompany)} employees,{" "}
              {formatCap(summary.tierLimits.maxPayrunsPerMonth)} pay runs / month.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void handleUpgrade()} disabled={checkoutLoading}>
              <Sparkles size={16} />
              {checkoutLoading ? "Working…" : "Upgrade plan"}
            </Button>
            <p className="text-xs text-hgh-muted">
              {summary?.accessBypassed
                ? "When payments go live, this will open checkout. For now it confirms you are not blocked."
                : "Opens checkout when Stripe is connected."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
