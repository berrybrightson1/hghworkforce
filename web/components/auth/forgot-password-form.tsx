"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import {
  resetPasswordVerificationSchema,
  type ResetPasswordVerificationFormValues,
  type ResetPasswordVerificationValues,
} from "@/lib/auth-password-policy";
import { useToast } from "@/components/toast/useToast";

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordVerificationFormValues, unknown, ResetPasswordVerificationValues>({
    resolver: zodResolver(resetPasswordVerificationSchema),
    defaultValues: {
      email: "",
      workspaceCountAnswer: "",
      password: "",
      confirm: "",
    },
  });

  const onSubmit = handleSubmit(async (v) => {
    setSubmitting(true);
    const res = await fetch("/api/auth/reset-password-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: v.email.trim(),
        workspaceCountAnswer: v.workspaceCountAnswer,
        password: v.password,
        confirm: v.confirm,
      }),
    });
    const data = (await res.json()) as { error?: string };
    setSubmitting(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not reset password.");
      return;
    }
    setDone(true);
    toast.success("Password updated. You can sign in now.");
  });

  if (done) {
    return (
      <div className="rounded-lg border border-hgh-border bg-white p-6 text-center text-sm text-hgh-slate">
        <p className="font-medium text-hgh-navy">You’re all set</p>
        <p className="mt-2 text-hgh-muted">Your password was reset. Use your new password to sign in.</p>
        <Link
          href="/sign-in"
          className="mt-4 inline-block text-sm font-semibold text-hgh-gold hover:text-hgh-gold/80"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-hgh-slate">
          Account email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          aria-invalid={errors.email ? "true" : "false"}
          className="flex h-11 w-full rounded-lg border border-hgh-border bg-white px-4 text-sm text-hgh-slate shadow-sm transition-colors placeholder:text-hgh-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold"
          {...register("email")}
        />
        {errors.email && <p className="mt-1.5 text-xs text-hgh-danger">{errors.email.message}</p>}
        <p className="mt-1.5 text-[11px] text-hgh-muted">
          We use this only to find your account — no email is sent in this step.
        </p>
      </div>

      <div className="rounded-lg border border-hgh-border/80 bg-hgh-offwhite/60 px-4 py-3">
        <label htmlFor="workspace-count" className="block text-sm font-medium text-hgh-navy">
          How many organisations appear in your company switcher?
        </label>
        <p className="mt-1.5 text-[11px] leading-relaxed text-hgh-muted">
          In the dashboard header, open the workspace switcher and count each organisation listed — usually{" "}
          <span className="font-medium text-hgh-navy">1</span> for company admins and HR. Platform operators
          enter the full count of companies shown there.
        </p>
        <input
          id="workspace-count"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 1"
          aria-invalid={errors.workspaceCountAnswer ? "true" : "false"}
          className="mt-3 flex h-11 w-full max-w-[8rem] rounded-lg border border-hgh-border bg-white px-4 text-sm text-hgh-slate shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold"
          {...register("workspaceCountAnswer", {
            setValueAs: (v) => (typeof v === "string" ? v.replace(/\D/g, "") : String(v ?? "")),
          })}
        />
        {errors.workspaceCountAnswer && (
          <p className="mt-1.5 text-xs text-hgh-danger">{String(errors.workspaceCountAnswer.message)}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-hgh-slate">
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            aria-invalid={errors.password ? "true" : "false"}
            className="flex h-11 w-full rounded-lg border border-hgh-border bg-white px-4 pr-12 text-sm text-hgh-slate shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowNew((x) => !x)}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-hgh-muted transition-colors hover:bg-hgh-offwhite hover:text-hgh-slate focus:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold"
            aria-label={showNew ? "Hide password" : "Show password"}
          >
            {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.password && <p className="mt-1.5 text-xs text-hgh-danger">{errors.password.message}</p>}
        <p className="mt-1.5 text-[11px] text-hgh-muted">
          At least 8 characters, one uppercase letter, and one number.
        </p>
      </div>

      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-hgh-slate">
          Confirm password
        </label>
        <div className="relative">
          <input
            id="confirm"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            aria-invalid={errors.confirm ? "true" : "false"}
            className="flex h-11 w-full rounded-lg border border-hgh-border bg-white px-4 pr-12 text-sm text-hgh-slate shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold"
            {...register("confirm")}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((x) => !x)}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-hgh-muted transition-colors hover:bg-hgh-offwhite hover:text-hgh-slate focus:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold"
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.confirm && <p className="mt-1.5 text-xs text-hgh-danger">{errors.confirm.message}</p>}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-hgh-gold font-semibold text-hgh-navy transition-all hover:bg-hgh-gold/90 focus:outline-none focus:ring-2 focus:ring-hgh-gold focus:ring-offset-2 disabled:opacity-60"
      >
        {submitting ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}
