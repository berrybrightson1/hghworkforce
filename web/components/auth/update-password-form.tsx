"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { loggedInChangePasswordSchema, type LoggedInChangePasswordFields } from "@/lib/auth-password-policy";
import { safeSettingsReturnPath } from "@/lib/settings-return-path";
import { useToast } from "@/components/toast/useToast";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const returnTo = useMemo(
    () => safeSettingsReturnPath(searchParams.get("returnTo")),
    [searchParams],
  );

  const forgotPasswordHref = useMemo(() => {
    const qs = searchParams.toString();
    const self = qs ? `${pathname}?${qs}` : pathname;
    return `/forgot-password?returnTo=${encodeURIComponent(self)}`;
  }, [pathname, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoggedInChangePasswordFields>({
    resolver: zodResolver(loggedInChangePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      toast.error("Your session expired. Sign in again.");
      router.push(`/sign-in?next=${encodeURIComponent(`/update-password?returnTo=${encodeURIComponent(returnTo)}`)}`);
      return;
    }

    setSubmitting(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: values.currentPassword,
    });
    if (signErr) {
      setSubmitting(false);
      toast.error("That isn’t your current password.");
      return;
    }

    const { error: updErr } = await supabase.auth.updateUser({ password: values.password });
    setSubmitting(false);
    if (updErr) {
      toast.error(updErr.message);
      return;
    }

    toast.success("Password updated.");
    router.push(returnTo);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium text-hgh-slate">
          Current password
        </label>
        <div className="relative">
          <input
            id="current-password"
            type={showCurrent ? "text" : "password"}
            autoComplete="current-password"
            aria-invalid={errors.currentPassword ? "true" : "false"}
            className="flex h-11 w-full rounded-lg border border-hgh-border bg-white px-4 pr-12 text-sm text-hgh-slate shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold"
            {...register("currentPassword")}
          />
          <button
            type="button"
            onClick={() => setShowCurrent((v) => !v)}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-hgh-muted transition-colors hover:bg-hgh-offwhite hover:text-hgh-slate focus:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold"
            aria-label={showCurrent ? "Hide password" : "Show password"}
          >
            {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.currentPassword && (
          <p className="mt-1.5 text-xs text-hgh-danger">{errors.currentPassword.message}</p>
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
            onClick={() => setShowNew((v) => !v)}
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
            onClick={() => setShowConfirm((v) => !v)}
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
        {submitting ? "Saving…" : "Change password"}
      </button>

      <p className="text-center text-sm text-hgh-muted">
        <Link
          href={forgotPasswordHref}
          className="font-medium text-hgh-navy underline decoration-hgh-gold/50 underline-offset-2"
        >
          Forgot current password?
        </Link>
      </p>
    </form>
  );
}
