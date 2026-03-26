"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthSubmitSpinner } from "@/components/auth/auth-submit-spinner";
import { useToast } from "@/components/toast/useToast";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  if (raw.startsWith("/dashboard") || raw.startsWith("/portal")) return raw;
  return "/dashboard";
}

function isEmailNotConfirmedError(error: { message: string; code?: string; status?: number }) {
  const msg = error.message.toLowerCase();
  return (
    error.code === "email_not_confirmed" ||
    msg.includes("email not confirmed") ||
    msg.includes("not confirmed")
  );
}

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendEmail, setResendEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const watchedEmail = watch("email");
  useEffect(() => {
    if (resendEmail && watchedEmail.trim().toLowerCase() !== resendEmail.trim().toLowerCase()) {
      setResendEmail(null);
    }
  }, [watchedEmail, resendEmail]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setSubmitting(false);
      if (isEmailNotConfirmedError(error)) {
        setResendEmail(values.email);
        toast.error(
          "Confirm your email first. Open the link we sent when you signed up (check spam). Then try signing in again.",
        );
        return;
      }
      setResendEmail(null);
      toast.error(error.message);
      return;
    }

    setResendEmail(null);
    const next = safeNextPath(searchParams.get("next"));
    router.push(next);
    router.refresh();
  });

  return (
    <div className="relative">
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-hgh-slate"
          >
            Email address
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
          {errors.email && (
            <p className="mt-1.5 text-xs text-hgh-danger">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium text-hgh-slate"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-hgh-gold transition-colors hover:text-hgh-gold/80"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={errors.password ? "true" : "false"}
              className="flex h-11 w-full rounded-lg border border-hgh-border bg-white px-4 pr-12 text-sm text-hgh-slate shadow-sm transition-colors placeholder:text-hgh-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-hgh-muted transition-colors hover:bg-hgh-offwhite hover:text-hgh-slate focus:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOffIcon className="h-5 w-5 shrink-0" />
              ) : (
                <EyeIcon className="h-5 w-5 shrink-0" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-hgh-danger">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-hgh-gold font-semibold text-hgh-navy transition-all hover:bg-hgh-gold/90 focus:outline-none focus:ring-2 focus:ring-hgh-gold focus:ring-offset-2 disabled:opacity-80 disabled:pointer-events-none"
        >
          {submitting ? (
            <>
              <AuthSubmitSpinner />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      {resendEmail && (
        <div
          className="mt-5 rounded-lg border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-hgh-navy"
          role="status"
        >
          <p className="font-medium text-hgh-navy">Email not verified yet</p>
          <p className="mt-1 text-xs leading-relaxed text-hgh-slate">
            We can send another confirmation message to <span className="font-medium">{resendEmail}</span>.
          </p>
          <button
            type="button"
            disabled={resending}
            onClick={async () => {
              setResending(true);
              const supabase = createClient();
              const { error: resendErr } = await supabase.auth.resend({
                type: "signup",
                email: resendEmail,
              });
              setResending(false);
              if (resendErr) {
                toast.error(resendErr.message);
                return;
              }
              toast.success("Check your inbox for the confirmation link.");
            }}
            className="mt-3 text-xs font-semibold text-hgh-gold underline decoration-hgh-gold/40 underline-offset-2 hover:text-hgh-gold/80 disabled:opacity-60"
          >
            {resending ? "Sending…" : "Resend confirmation email"}
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-hgh-border" />
        <span className="text-xs text-hgh-muted">New to HGH Payroll?</span>
        <div className="h-px flex-1 bg-hgh-border" />
      </div>

      {/* Sign up link */}
      <Link
        href="/sign-up"
        className="flex h-11 w-full items-center justify-center rounded-lg border border-hgh-border bg-white text-sm font-medium text-hgh-slate transition-all hover:border-hgh-gold/40 hover:bg-hgh-offwhite focus:outline-none focus:ring-2 focus:ring-hgh-gold focus:ring-offset-2"
      >
        Create an account
      </Link>
    </div>
  );
}
