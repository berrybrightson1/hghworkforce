"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Building2, UserPlus } from "lucide-react";
import { useToast } from "@/components/toast/useToast";

type Mode = "choose" | "create" | "join";

export function OnboardingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("choose");
  const [companyName, setCompanyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const inputClass =
    "flex h-11 w-full rounded-lg border border-hgh-border bg-white px-4 text-sm text-hgh-slate shadow-sm transition-colors placeholder:text-hgh-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const body =
      mode === "create"
        ? { action: "create_company", companyName }
        : { action: "join_company", inviteCode };

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      toast.error(data.error ?? "Something went wrong");
      return;
    }

    toast.success(
      mode === "create"
        ? "Company created! Redirecting to dashboard..."
        : "Joined company! Redirecting to dashboard...",
    );
    router.push("/dashboard");
    router.refresh();
  }

  if (mode === "choose") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setMode("create")}
          className="group flex w-full items-center gap-4 rounded-xl border border-hgh-border bg-white p-5 text-left transition-all hover:border-hgh-gold/40 hover:shadow-md"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-hgh-navy transition-colors group-hover:bg-hgh-gold">
            <Building2
              className="h-6 w-6 text-hgh-gold transition-colors group-hover:text-hgh-navy"
              strokeWidth={2}
              aria-hidden
            />
          </div>
          <div>
            <p className="font-semibold text-hgh-navy">Create a company</p>
            <p className="mt-0.5 text-sm text-hgh-muted">
              Set up a new company workspace and start managing payroll
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMode("join")}
          className="group flex w-full items-center gap-4 rounded-xl border border-hgh-border bg-white p-5 text-left transition-all hover:border-hgh-gold/40 hover:shadow-md"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-hgh-navy transition-colors group-hover:bg-hgh-gold">
            <UserPlus
              className="h-6 w-6 text-hgh-gold transition-colors group-hover:text-hgh-navy"
              strokeWidth={2}
              aria-hidden
            />
          </div>
          <div>
            <p className="font-semibold text-hgh-navy">Join with invite code</p>
            <p className="mt-0.5 text-sm text-hgh-muted">
              Enter an invite code from your company administrator
            </p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setMode("choose")}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-hgh-muted transition-colors hover:text-hgh-navy"
      >
        <ArrowLeft className="h-[18px] w-[18px]" aria-hidden />
        Back
      </button>

      <div className="rounded-xl border border-hgh-border bg-white p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-hgh-gold/10">
            {mode === "create" ? (
              <Building2 className="h-5 w-5 text-hgh-gold" strokeWidth={2} aria-hidden />
            ) : (
              <UserPlus className="h-5 w-5 text-hgh-gold" strokeWidth={2} aria-hidden />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-hgh-navy">
              {mode === "create" ? "Create a company" : "Join a company"}
            </h2>
            <p className="text-xs text-hgh-muted">
              {mode === "create"
                ? "You will be the Company Admin for this workspace"
                : "Enter the code your administrator shared with you"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "create" ? (
            <div>
              <label
                htmlFor="companyName"
                className="mb-1.5 block text-sm font-medium text-hgh-slate"
              >
                Company name
              </label>
              <input
                id="companyName"
                type="text"
                placeholder="e.g. Hobort Shipping & Logistics"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={inputClass}
                required
                minLength={2}
              />
            </div>
          ) : (
            <div>
              <label
                htmlFor="inviteCode"
                className="mb-1.5 block text-sm font-medium text-hgh-slate"
              >
                Invite code
              </label>
              <input
                id="inviteCode"
                type="text"
                placeholder="e.g. INV-XXXX-XXXX"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-hgh-gold font-semibold text-hgh-navy transition-all hover:bg-hgh-gold/90 focus:outline-none focus:ring-2 focus:ring-hgh-gold focus:ring-offset-2 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-hgh-navy/30 border-t-hgh-navy" />
                {mode === "create" ? "Creating..." : "Joining..."}
              </>
            ) : mode === "create" ? (
              "Create company"
            ) : (
              "Join company"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
