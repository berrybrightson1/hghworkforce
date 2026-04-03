"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PlanName } from "@/lib/planPermissions";

type PlanOption = {
  key: PlanName;
  icon: string;
  title: string;
  description: string;
  included: string[];
  notIncluded?: string[];
  cta: string;
  highlight?: boolean;
};

const planOptions: PlanOption[] = [
  {
    key: "STARTER_PAYROLL",
    icon: "payments",
    title: "Payroll Starter",
    description:
      "Full payroll processing, Ghana PAYE & SSNIT calculations, payslips, and basic staff portal access.",
    included: ["Payroll", "Staff Portal (basic)", "Basic Reports"],
    notIncluded: ["Attendance", "Leave", "Loans"],
    cta: "Choose Payroll Starter",
  },
  {
    key: "STARTER_ATTENDANCE",
    icon: "fingerprint",
    title: "Attendance Starter",
    description:
      "Office kiosk clock-in/out, attendance tracking, corrections, and basic staff portal access.",
    included: ["Attendance", "Kiosk", "Staff Portal (basic)", "Basic Reports"],
    notIncluded: ["Payroll", "Leave", "Loans"],
    cta: "Choose Attendance Starter",
  },
  {
    key: "PRO",
    icon: "workspace_premium",
    title: "Pro",
    description:
      "Everything in one place. Full payroll, attendance, leave, loans, advanced reports, and complete staff portal.",
    included: ["All modules"],
    cta: "Choose Pro",
    highlight: true,
  },
];

function getPriceMap() {
  try {
    const raw = process.env.NEXT_PUBLIC_PLAN_PRICES;
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed;
  } catch {
    return {};
  }
}

export default function SubscribePage() {
  const router = useRouter();
  const { selected, loading } = useCompany();
  const { toast } = useToast();
  const [activating, setActivating] = useState<PlanName | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const prices = useMemo(() => getPriceMap(), []);
  const reason =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("reason") : null;
  const isExpired = reason === "trial_expired";

  const heading = "Choose your plan";
  const subheading = isExpired
    ? "You've completed your free trial. Select the plan that fits your business."
    : "Manage your subscription.";

  async function activatePlan(plan: PlanName) {
    if (!selected?.id) {
      toast.error("Select a workspace first.");
      return;
    }
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
      const label = planOptions.find((p) => p.key === plan)?.title ?? plan;
      toast.success(`Welcome to HGH WorkForce. Your ${label} plan is now active.`);
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Could not activate plan.");
    } finally {
      setActivating(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-hgh-navy">{heading}</h1>
        <p className="mt-2 text-sm text-hgh-muted">{subheading}</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {planOptions.map((plan) => (
          <Card
            key={plan.key}
            className={plan.highlight ? "border-hgh-gold/40 shadow-sm" : ""}
          >
            <CardHeader>
              <div className="mb-2 flex items-center justify-between">
                <span className="material-symbols-outlined text-hgh-gold" aria-hidden>
                  {plan.icon}
                </span>
                {plan.highlight ? (
                  <span className="rounded-md bg-hgh-gold/15 px-2 py-0.5 text-[11px] font-medium text-hgh-gold">
                    Most Popular
                  </span>
                ) : null}
              </div>
              <CardTitle className="text-lg">{plan.title}</CardTitle>
              <p className="text-sm text-hgh-muted">{plan.description}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-hgh-navy">
                {prices[plan.key] || "[PRICE_PLACEHOLDER]"}
              </p>
              <ul className="mt-3 space-y-1 text-xs text-hgh-slate">
                {plan.included.map((line) => (
                  <li key={line}>Included: {line}</li>
                ))}
                {plan.notIncluded?.map((line) => (
                  <li key={line}>Not included: {line}</li>
                ))}
              </ul>
              <Button
                type="button"
                className="mt-4 w-full"
                onClick={() => void activatePlan(plan.key)}
                disabled={loading || !selected || activating === plan.key}
              >
                {activating === plan.key ? "Saving..." : plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setShowCompare((v) => !v)}
          className="text-sm font-medium text-hgh-gold underline underline-offset-2"
        >
          {showCompare ? "Hide plan comparison" : "Compare plans"}
        </button>
      </div>

      {showCompare ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-hgh-border bg-white p-4">
          <table className="w-full min-w-[36rem] border-collapse text-xs text-hgh-slate">
            <thead>
              <tr className="border-b border-hgh-border">
                <th className="p-2 text-left font-semibold text-hgh-navy">Feature</th>
                <th className="p-2 text-left font-semibold text-hgh-navy">Payroll Starter</th>
                <th className="p-2 text-left font-semibold text-hgh-navy">Attendance Starter</th>
                <th className="p-2 text-left font-semibold text-hgh-navy">Pro</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Payroll", "Yes", "No", "Yes"],
                ["Attendance & Kiosk", "No", "Yes", "Yes"],
                ["Leave & Loans", "No", "No", "Yes"],
                ["Staff Portal", "Basic", "Basic", "Full"],
                ["Reports", "Basic", "Basic", "Advanced"],
              ].map((row) => (
                <tr key={row[0]} className="border-b border-hgh-border/60 last:border-b-0">
                  <td className="p-2">{row[0]}</td>
                  <td className="p-2">{row[1]}</td>
                  <td className="p-2">{row[2]}</td>
                  <td className="p-2">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="mt-6 text-center text-xs text-hgh-muted">
        Need help choosing?{" "}
        <a
          href="mailto:support@hghworkforce.com"
          className="font-medium text-hgh-gold underline underline-offset-2"
        >
          Contact us.
        </a>
      </p>
    </main>
  );
}
