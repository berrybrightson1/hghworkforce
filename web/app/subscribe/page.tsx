"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  Banknote,
  Check,
  ChevronRight,
  Crown,
  Fingerprint,
  Loader2,
  Minus,
  Shield,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/swr";
import type { PlanName } from "@/lib/planPermissions";
import { cn } from "@/lib/utils";

type Me = { role: string; name: string };

type BillingSummary = {
  companyName: string;
  plan?: PlanName | "TRIAL";
  subscriptionStatus: string;
  subscribed: boolean;
  locked: boolean;
  fullAccess: boolean;
  msRemaining: number;
  trialEndsAt: string;
};

type SubscribablePlan = Exclude<PlanName, "TRIAL">;

type PlanOption = {
  key: SubscribablePlan;
  badge: string;
  icon: LucideIcon;
  /** Large headline under badge row */
  headline: string;
  tagline: string;
  includedLabel: string;
  included: string[];
  excluded?: string[];
  highlight?: boolean;
};

const PLAN_OPTIONS: PlanOption[] = [
  {
    key: "STARTER_PAYROLL",
    badge: "Payroll",
    icon: Banknote,
    headline: "Payroll essentials",
    tagline: "Ideal for teams that need compliant Ghana payroll first.",
    includedLabel: "What's included",
    included: ["Payroll & PAYE / SSNIT", "Payslips & bank export", "Basic reports", "Staff portal (essentials)"],
    excluded: ["Attendance & kiosk", "Leave & loans", "Advanced reports"],
  },
  {
    key: "PRO",
    badge: "Pro",
    icon: Crown,
    headline: "Full workspace",
    tagline: "Payroll, attendance, people workflows, and insights in one subscription.",
    includedLabel: "Everything in starters, plus",
    included: [
      "Unlimited use of payroll & attendance modules",
      "Leave & loans",
      "Full staff portal",
      "Advanced reports & cost vs revenue",
    ],
    highlight: true,
  },
  {
    key: "STARTER_ATTENDANCE",
    badge: "Attendance",
    icon: Fingerprint,
    headline: "Attendance essentials",
    tagline: "Kiosk check-in, history, and corrections without full payroll.",
    includedLabel: "What's included",
    included: ["Office kiosk check-in", "Attendance & corrections", "Basic reports", "Staff portal (essentials)"],
    excluded: ["Payroll runs", "Leave & loans", "Advanced reports"],
  },
];

/** Order on screen: Payroll | Pro (center, popular) | Attendance — matches common “good / best / alt” pattern */
const PLAN_ORDER: SubscribablePlan[] = ["STARTER_PAYROLL", "PRO", "STARTER_ATTENDANCE"];

type PriceShape = { monthly: string; yearly: string };

/** Default list prices (Ghana cedis, whole amounts). Override with NEXT_PUBLIC_PLAN_PRICES if needed. */
const PLAN_MONTHLY_GHS: Record<SubscribablePlan, number> = {
  STARTER_PAYROLL: 299,
  STARTER_ATTENDANCE: 299,
  PRO: 499,
};

/** Annual totals (listed price — not 12 × monthly). */
const PLAN_ANNUAL_GHS: Record<SubscribablePlan, number> = {
  STARTER_PAYROLL: 2999,
  STARTER_ATTENDANCE: 2999,
  PRO: 4999,
};

function formatCedisInteger(value: number): string {
  return Math.round(value).toLocaleString("en-GH");
}

/** Display monthly as ¢299/mo (whole cedis, no decimals). */
function formatMonthlyPriceLine(monthlyWhole: number): string {
  return `¢${formatCedisInteger(monthlyWhole)}/mo`;
}

function formatYearlyPriceLine(yearlyTotal: number): string {
  return `¢${formatCedisInteger(yearlyTotal)}/yr`;
}

function defaultPriceBook(): Record<SubscribablePlan, PriceShape> {
  const m = PLAN_MONTHLY_GHS;
  const y = PLAN_ANNUAL_GHS;
  return {
    STARTER_PAYROLL: {
      monthly: formatMonthlyPriceLine(m.STARTER_PAYROLL),
      yearly: formatYearlyPriceLine(y.STARTER_PAYROLL),
    },
    STARTER_ATTENDANCE: {
      monthly: formatMonthlyPriceLine(m.STARTER_ATTENDANCE),
      yearly: formatYearlyPriceLine(y.STARTER_ATTENDANCE),
    },
    PRO: {
      monthly: formatMonthlyPriceLine(m.PRO),
      yearly: formatYearlyPriceLine(y.PRO),
    },
  };
}

function parsePublicPrices(): Record<SubscribablePlan, PriceShape> {
  const defaults = defaultPriceBook();
  const out: Record<SubscribablePlan, PriceShape> = {
    STARTER_PAYROLL: { ...defaults.STARTER_PAYROLL },
    STARTER_ATTENDANCE: { ...defaults.STARTER_ATTENDANCE },
    PRO: { ...defaults.PRO },
  };
  try {
    const raw = process.env.NEXT_PUBLIC_PLAN_PRICES;
    if (!raw) return out;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const key of PLAN_ORDER) {
      const v = parsed[key];
      if (typeof v === "string") {
        out[key] = { monthly: v, yearly: defaults[key].yearly };
      } else if (v && typeof v === "object" && v !== null) {
        const o = v as { monthly?: string; yearly?: string; m?: string; y?: string };
        const monthly = o.monthly ?? o.m ?? defaults[key].monthly;
        const yearly = o.yearly ?? o.y ?? defaults[key].yearly;
        out[key] = { monthly, yearly };
      }
    }
  } catch {
    /* keep defaults */
  }
  return out;
}

const COMPARE_ROWS: [string, boolean, boolean, boolean][] = [
  ["Payroll & payslips", true, false, true],
  ["Attendance & kiosk", false, true, true],
  ["Leave management", false, false, true],
  ["Loans", false, false, true],
  ["Staff portal", true, true, true],
  ["Advanced reports", false, false, true],
];

function canActivatePlans(role: string | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
}

function planByKey(key: SubscribablePlan): PlanOption {
  const p = PLAN_OPTIONS.find((x) => x.key === key);
  if (!p) throw new Error("plan");
  return p;
}

export default function SubscribePage() {
  const router = useRouter();
  const { selected, loading: companiesLoading, mutate: refreshCompanies } = useCompany();
  const { data: me } = useApi<Me>("/api/me");
  const { toast } = useToast();
  const [activating, setActivating] = useState<PlanName | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlanKey, setSelectedPlanKey] = useState<SubscribablePlan | null>("PRO");

  useEffect(() => {
    setReason(new URLSearchParams(window.location.search).get("reason"));
  }, []);

  const priceBook = useMemo(() => parsePublicPrices(), []);

  const summaryUrl =
    selected?.id != null ? `/api/billing/summary?companyId=${encodeURIComponent(selected.id)}` : null;
  const { data: summary, isLoading: summaryLoading } = useApi<BillingSummary>(summaryUrl);

  const isExpired = reason === "trial_expired";
  const billingOk = canActivatePlans(me?.role);
  const currentPlan = summary?.plan as PlanName | "TRIAL" | undefined;

  useEffect(() => {
    if (currentPlan === "STARTER_PAYROLL" || currentPlan === "STARTER_ATTENDANCE" || currentPlan === "PRO") {
      setSelectedPlanKey(currentPlan);
    }
  }, [currentPlan]);

  async function activatePlan(plan: SubscribablePlan) {
    if (!selected?.id) {
      toast.error("Select a workspace first.");
      return;
    }
    if (!billingOk) {
      toast.error("Only a company administrator can change the plan.");
      return;
    }
    setSelectedPlanKey(plan);
    setActivating(plan);
    try {
      const res = await fetch("/api/subscription/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, companyId: selected.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not activate plan.");
        return;
      }
      const label = planByKey(plan).headline;
      toast.success(`${label} is now active for ${summary?.companyName ?? "your workspace"}.`);
      await refreshCompanies();
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Could not activate plan.");
    } finally {
      setActivating(null);
    }
  }

  const loading = companiesLoading || (selected?.id != null && summaryLoading);

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        {/* Slim hero */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hgh-gold">Plans & pricing</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-hgh-navy sm:text-4xl">
            {isExpired ? "Continue with the right plan" : "Choose how your workspace runs"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-hgh-muted sm:text-base">
            {isExpired
              ? "Select a plan to restore access. You can switch again later from this page."
              : "Select a card to highlight your choice, then confirm. Paystack billing for Ghana is available from Billing when enabled."}
          </p>
          {summary && !summary.fullAccess ? (
            <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-950">
              <Shield className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              This workspace is locked until a plan is active.
            </p>
          ) : null}
        </div>

        {/* Alerts */}
        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {!selected?.id && !companiesLoading ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
              Select a workspace in the header (super admins) or finish onboarding.
            </div>
          ) : null}
          {me && !billingOk ? (
            <div className="rounded-xl border border-hgh-border bg-hgh-offwhite px-4 py-3 text-center text-sm text-hgh-slate">
              <span className="font-semibold text-hgh-navy">View only.</span> Ask a company admin to change the plan, or
              see{" "}
              <Link href="/dashboard/help" className="font-medium text-hgh-gold underline underline-offset-2">
                Help
              </Link>
              .
            </div>
          ) : null}
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-hgh-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading workspace…
            </div>
          ) : summary ? (
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-hgh-border bg-hgh-offwhite/80 px-4 py-2.5 text-center text-sm">
              <span className="text-hgh-muted">Workspace</span>
              <span className="font-semibold text-hgh-navy">{summary.companyName}</span>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-hgh-navy ring-1 ring-hgh-border">
                {summary.plan ?? "TRIAL"}
              </span>
              {summary.subscribed ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  Active
                </span>
              ) : null}
              <Link href="/dashboard/billing" className="text-xs font-semibold text-hgh-gold hover:underline">
                Billing →
              </Link>
            </div>
          ) : null}
        </div>

        {/* Billing toggle */}
        <div className="mx-auto mt-10 flex justify-center">
          <div
            className="inline-flex rounded-full border border-hgh-border bg-hgh-offwhite/90 p-1 shadow-sm"
            role="group"
            aria-label="Billing cycle"
          >
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-all",
                billingCycle === "monthly"
                  ? "bg-hgh-navy text-white shadow"
                  : "text-hgh-muted hover:text-hgh-navy",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-all",
                billingCycle === "yearly"
                  ? "bg-hgh-navy text-white shadow"
                  : "text-hgh-muted hover:text-hgh-navy",
              )}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <section className="mx-auto mt-10 grid max-w-6xl gap-6 lg:grid-cols-3 lg:items-stretch">
          {PLAN_ORDER.map((planKey) => {
            const plan = planByKey(planKey);
            const Icon = plan.icon;
            const isCurrent = currentPlan === plan.key;
            const isSelected = selectedPlanKey === plan.key;
            const busy = activating === plan.key;
            const prices = priceBook[plan.key];
            const mainPrice = billingCycle === "yearly" ? prices.yearly : prices.monthly;
            const monthlyGhs = PLAN_MONTHLY_GHS[plan.key];
            const annualGhs = PLAN_ANNUAL_GHS[plan.key];
            const subPrice =
              billingCycle === "yearly"
                ? `Full year upfront · confirm in Billing`
                : `Annual: ¢${formatCedisInteger(annualGhs)}/yr · Billing`;

            const selectable = billingOk && selected?.id && !companiesLoading;

            return (
              <div
                key={plan.key}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-white p-6 text-left shadow-md transition-all duration-200 sm:p-7",
                  plan.highlight
                    ? "border-hgh-border lg:z-10 hover:border-hgh-gold/40 hover:shadow-xl"
                    : "border-hgh-border hover:border-hgh-gold/40 hover:shadow-lg",
                  selectable && "cursor-pointer",
                  isSelected &&
                    selectable &&
                    "border-hgh-gold/55 bg-hgh-gold/[0.06] shadow-[0_8px_30px_-8px_rgba(10,22,40,0.12)]",
                )}
                aria-current={isSelected && selectable ? "true" : undefined}
                onClick={() => selectable && setSelectedPlanKey(plan.key)}
              >
                {plan.highlight ? (
                  <div className="absolute -right-px -top-px rounded-bl-lg rounded-tr-2xl bg-hgh-gold px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-hgh-navy">
                    Most popular
                  </div>
                ) : null}

                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex rounded-full bg-hgh-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-hgh-navy">
                    {plan.badge}
                  </span>
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-hgh-border/80",
                      plan.highlight ? "bg-hgh-gold/10 text-hgh-gold" : "bg-hgh-offwhite text-hgh-navy",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                </div>

                <h2 className="mt-5 text-2xl font-bold tracking-tight text-hgh-navy sm:text-[1.65rem]">
                  {plan.headline}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-hgh-muted">{plan.tagline}</p>

                <div className="mt-6 border-t border-hgh-border/60 pt-6">
                  <p className="text-4xl font-bold tracking-tight text-hgh-navy sm:text-[2.5rem]">{mainPrice}</p>
                  <p className="mt-1.5 text-sm text-hgh-muted">{subPrice}</p>
                </div>

                <Button
                  type="button"
                  className={cn(
                    "mt-6 h-11 w-full text-sm font-semibold",
                    plan.highlight
                      ? ""
                      : "border-2 border-hgh-gold/35 bg-hgh-gold/10 text-hgh-navy hover:bg-hgh-gold/20",
                  )}
                  variant={plan.highlight ? "primary" : "ghost"}
                  onClick={(e) => {
                    e.stopPropagation();
                    void activatePlan(plan.key);
                  }}
                  disabled={!selected?.id || !billingOk || busy || isCurrent || companiesLoading}
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Activating…
                    </>
                  ) : isCurrent ? (
                    "Current plan"
                  ) : (
                    <>
                      {isSelected ? "Activate this plan" : "Select & activate"}
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </>
                  )}
                </Button>

                <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.16em] text-hgh-muted">
                  {plan.includedLabel}
                </p>
                <ul className="mt-3 space-y-2.5">
                  {plan.included.map((line) => (
                    <li key={line} className="flex gap-2.5 text-sm text-hgh-slate">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-hgh-gold" strokeWidth={2.5} aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                  {plan.excluded?.map((line) => (
                    <li key={line} className="flex gap-2.5 text-sm text-hgh-muted/80">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-hgh-border bg-hgh-offwhite">
                        <Minus className="h-2.5 w-2.5 text-hgh-muted" strokeWidth={3} aria-hidden />
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCompare(true);
                    document.getElementById("compare-plans")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="mt-6 text-left text-sm font-semibold text-hgh-gold hover:text-hgh-navy hover:underline"
                >
                  Compare all plans <span aria-hidden>→</span>
                </button>

                {isCurrent ? (
                  <span className="mt-4 inline-flex w-fit rounded-md bg-hgh-navy px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    Your plan
                  </span>
                ) : null}
              </div>
            );
          })}
        </section>

        <div id="compare-plans" className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowCompare((v) => !v)}
            className="text-sm font-semibold text-hgh-gold underline-offset-2 hover:underline"
          >
            {showCompare ? "Hide feature matrix" : "Open feature matrix"}
          </button>
        </div>

        {showCompare ? (
          <div className="mx-auto mt-6 max-w-4xl overflow-x-auto rounded-2xl border border-hgh-border bg-white shadow-sm">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-hgh-border bg-hgh-offwhite/90">
                  <th className="px-4 py-3 text-left font-bold text-hgh-navy">Capability</th>
                  <th className="px-4 py-3 text-center font-bold text-hgh-navy">Payroll</th>
                  <th className="px-4 py-3 text-center font-bold text-hgh-navy">Pro</th>
                  <th className="px-4 py-3 text-center font-bold text-hgh-navy">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map(([label, payroll, att, pro]) => (
                  <tr key={label} className="border-b border-hgh-border/70 last:border-0">
                    <td className="px-4 py-2.5 text-hgh-slate">{label}</td>
                    <td className="px-4 py-2.5 text-center">
                      {payroll ? <Check className="mx-auto h-4 w-4 text-hgh-gold" strokeWidth={2.5} /> : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {pro ? <Check className="mx-auto h-4 w-4 text-hgh-gold" strokeWidth={2.5} /> : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {att ? <Check className="mx-auto h-4 w-4 text-hgh-gold" strokeWidth={2.5} /> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <p className="mx-auto mt-12 max-w-lg text-center text-xs leading-relaxed text-hgh-muted">
          <Sparkles className="mx-auto mb-2 h-4 w-4 text-hgh-gold/80" aria-hidden />
          Questions?{" "}
          <a href="mailto:support@hghworkforce.com" className="font-semibold text-hgh-gold hover:underline">
            Contact us
          </a>{" "}
          · Paystack for Ghana in{" "}
          <Link href="/dashboard/billing" className="font-semibold text-hgh-gold hover:underline">
            Billing
          </Link>
        </p>
      </div>
    </main>
  );
}
