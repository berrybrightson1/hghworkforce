"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Sparkles } from "lucide-react";
import { useCompany } from "@/components/company-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DismissibleCallout } from "@/components/ui/dismissible-callout";
import { useToast } from "@/components/toast/useToast";
import { TRIAL_DAYS } from "@/lib/billing/access";
import { useApi } from "@/lib/swr";
import { HintTooltip } from "@/components/ui/hint-tooltip";

type Summary = {
  companyName: string;
  subscriptionStatus: string;
  trialDays: number;
  trialEndsAt: string;
  subscribed: boolean;
  fullAccess: boolean;
  locked: boolean;
  superAdminExempt?: boolean;
  msRemaining: number;
  paymentProviderConfigured: boolean;
};

export default function BillingPage() {
  const { selected, loading } = useCompany();
  const { data: me } = useApi<{ role: string }>("/api/me");
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

    void (async () => {
      try {
        const res = await fetch(`/api/billing/summary?companyId=${encodeURIComponent(selected.id)}`);
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

  useEffect(() => {
    if (me?.role === "SUPER_ADMIN") return;
    if (typeof window === "undefined" || !summary?.locked || !selected?.id) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("locked") !== "1") return;
    const k = `hgh-billing-locked-toast-${selected.id}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
    toast.error("Your free trial has ended. Subscribe below to restore access.");
  }, [summary?.locked, selected?.id, toast, me?.role]);

  async function handleSubscribe() {
    if (!selected?.id) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: selected.id }),
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
            Select a company in the sidebar to view trial and subscription status.
          </p>
        </CardHeader>
      </Card>
    );
  }

  const trialEnd = summary?.trialEndsAt ? new Date(summary.trialEndsAt) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-hgh-navy">Billing</h2>
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
            <CardTitle className="text-lg">Free trial & subscription</CardTitle>
            <p className="mt-1 text-sm text-hgh-muted">
              Everyone gets the same product. New workspaces receive a {TRIAL_DAYS}-day trial with every feature.
              After that, the workspace is locked until subscription is active.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary?.superAdminExempt ? (
            <DismissibleCallout
              storageKey="hgh-dismiss-billing-super-admin-callout"
              className="items-start rounded-lg border border-hgh-gold/35 bg-hgh-gold/10 px-4 py-3 text-sm text-hgh-navy"
            >
              <div>
                <p className="font-semibold">Super admin — full access</p>
                <p className="mt-1 text-hgh-muted">
                  Trial and subscription limits do not apply to your account. You can work in any company regardless of
                  workspace billing state. The status below is the real state for that tenant&apos;s admins and staff.
                </p>
              </div>
            </DismissibleCallout>
          ) : null}
          <div className="rounded-lg border border-hgh-border bg-hgh-offwhite/80 px-4 py-3">
            <p className="text-sm font-medium text-hgh-navy">
              {summary?.superAdminExempt
                ? "Your access: unrestricted (operator)"
                : summary?.subscribed
                  ? "Subscribed — full access"
                  : summary?.locked
                    ? "Trial ended — locked"
                    : "Trial active — full access"}
            </p>
            <p className="mt-1 text-xs text-hgh-muted">
              Subscription status:{" "}
              <span className="font-medium text-hgh-slate">{summary?.subscriptionStatus ?? "—"}</span>
              {trialEnd ? (
                <>
                  {" "}
                  · Trial ends{" "}
                  <time dateTime={trialEnd.toISOString()}>{trialEnd.toLocaleString()}</time>
                </>
              ) : null}
            </p>
            {summary && !summary.subscribed && !summary.locked && summary.msRemaining > 0 ? (
              <p className="mt-2 text-xs text-hgh-muted">
                About {Math.max(0, Math.ceil(summary.msRemaining / 86_400_000))} day(s) remaining in the trial
                window.
              </p>
            ) : null}
          </div>

          <DismissibleCallout
            storageKey={`hgh-dismiss-billing-operator-note-${selected?.id ?? "none"}`}
            className="items-start rounded-lg border border-dashed border-hgh-border bg-white px-4 py-3 text-xs text-hgh-muted"
          >
            <p>
              <strong className="text-hgh-slate">Paying customers:</strong> when Stripe is connected, use the button
              below to open checkout. Until then, your operator can set{" "}
              <code className="rounded bg-hgh-offwhite px-1">subscriptionStatus</code> to{" "}
              <code className="rounded bg-hgh-offwhite px-1">ACTIVE</code> for this company in the database to unlock
              immediately after trial.
            </p>
          </DismissibleCallout>

          <div className="flex flex-wrap items-center gap-3">
            <HintTooltip
              content={
                summary?.subscribed
                  ? "Billing management UI is coming soon; your operator can still adjust status in the database if needed."
                  : "Start or resume checkout when Stripe is connected, or ask your operator to activate the workspace subscription."
              }
            >
              <Button type="button" onClick={() => void handleSubscribe()} disabled={checkoutLoading}>
                <Sparkles size={16} />
                {checkoutLoading ? "Working…" : summary?.subscribed ? "Manage billing (coming soon)" : "Subscribe"}
              </Button>
            </HintTooltip>
            {!summary?.paymentProviderConfigured ? (
              <p className="text-xs text-hgh-muted">Online checkout activates when Stripe is configured.</p>
            ) : null}
          </div>

          <p className="text-xs text-hgh-muted">
            Questions? See{" "}
            <HintTooltip content="Billing FAQs, trial behavior, and where to find features in the product.">
              <Link href="/dashboard/help" className="font-medium text-hgh-gold underline underline-offset-2">
                Help
              </Link>
            </HintTooltip>{" "}
            or contact your administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
