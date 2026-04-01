"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthSubmitSpinner } from "@/components/auth/auth-submit-spinner";
import { useToast } from "@/components/toast/useToast";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { DISPOSABLE_EMAIL_USER_MESSAGE } from "@/lib/disposable-email-copy";
import { computeDeviceFingerprint } from "@/lib/device-fingerprint";
import { createClient } from "@/lib/supabase/client";

const schema = z
  .object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
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

export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("email");
    setSubmitting(true);
    try {
      const validateRes = await fetch("/api/auth/validate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email.trim().toLowerCase() }),
      });
      const v = (await validateRes.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!validateRes.ok || v.ok === false) {
        setSubmitting(false);
        setError("email", { type: "manual", message: v.message ?? DISPOSABLE_EMAIL_USER_MESSAGE });
        return;
      }

      const fingerprint = await computeDeviceFingerprint();
      if (!fingerprint) {
        setSubmitting(false);
        toast.error("Could not prepare this device for sign-up. Try another browser or disable strict blocking.");
        return;
      }

      const pre = await fetch("/api/auth/signup-precheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email.trim().toLowerCase(),
          fingerprint,
        }),
      });
      const preJson = (await pre.json().catch(() => ({}))) as {
        ok?: boolean;
        ticket?: string;
        toast?: string;
        fieldErrors?: { email?: string };
      };

      if (preJson.fieldErrors?.email) {
        setSubmitting(false);
        setError("email", { type: "manual", message: preJson.fieldErrors.email });
        return;
      }

      if (!pre.ok) {
        setSubmitting(false);
        if (typeof preJson.toast === "string") {
          toast.error(preJson.toast);
          return;
        }
        toast.error(
          typeof (preJson as { error?: string }).error === "string"
            ? (preJson as { error: string }).error
            : "Sign-up could not continue. Try again later.",
        );
        return;
      }

      const ticket = preJson.ticket;
      if (!ticket) {
        setSubmitting(false);
        toast.error("Sign-up could not continue. Try again later.");
        return;
      }

      const supabase = createClient();
      const { error, data } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
          },
        },
      });

      if (error) {
        setSubmitting(false);
        toast.error(error.message);
        return;
      }

      if (data.session) {
        const fin = await fetch("/api/auth/finalize-trial-device", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket, fingerprint }),
          credentials: "include",
        });
        if (!fin.ok) {
          const fj = (await fin.json().catch(() => ({}))) as { error?: string };
          setSubmitting(false);
          toast.error(fj.error ?? "Account created, but device registration failed. Contact support.");
          return;
        }
      }

      setSubmitting(false);
      toast.success("Account created. Welcome to HGH WorkForce.");
      router.push("/sign-in");
    } catch {
      setSubmitting(false);
      toast.error("Something went wrong. Try again.");
    }
  });

  const inputClass =
    "flex h-11 w-full rounded-lg border border-hgh-border bg-white px-4 text-sm text-hgh-slate shadow-sm transition-colors placeholder:text-hgh-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold";

  return (
    <div className="relative">
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Full name */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <label htmlFor="fullName" className="block text-sm font-medium text-hgh-slate">
              Full name
            </label>
            <HintTooltip
              content="Your name as it should appear to colleagues. You can match your payroll or ID records."
              side="right"
              contentClassName="max-w-[14rem]"
            >
              <span className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-hgh-border text-[10px] font-bold text-hgh-muted">
                i
              </span>
            </HintTooltip>
          </div>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder="Kwame Mensah"
            aria-invalid={errors.fullName ? "true" : "false"}
            className={inputClass}
            {...register("fullName")}
          />
          {errors.fullName && (
            <p className="mt-1.5 text-xs text-hgh-danger">{errors.fullName.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-hgh-slate">
              Email address
            </label>
            <HintTooltip
              content="Use a stable work or personal inbox you can access for password resets. Temporary or throwaway domains are blocked."
              side="right"
              contentClassName="max-w-[15rem]"
            >
              <span className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-hgh-border text-[10px] font-bold text-hgh-muted">
                i
              </span>
            </HintTooltip>
          </div>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={errors.email ? "true" : "false"}
            className={inputClass}
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-hgh-danger">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-hgh-slate">
              Password
            </label>
            <HintTooltip
              content="Minimum eight characters with at least one capital letter and one number. Avoid words guessable from your email."
              side="right"
              contentClassName="max-w-[16rem]"
            >
              <span className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-hgh-border text-[10px] font-bold text-hgh-muted">
                i
              </span>
            </HintTooltip>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Min 8 characters"
              aria-invalid={errors.password ? "true" : "false"}
              className={`${inputClass} pr-12`}
              {...register("password")}
            />
            <HintTooltip content={showPassword ? "Mask password characters" : "Reveal password to verify typing"}>
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
            </HintTooltip>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-hgh-danger">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-hgh-slate">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.confirmPassword ? "true" : "false"}
            className={inputClass}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="mt-1.5 text-xs text-hgh-danger">{errors.confirmPassword.message}</p>
          )}
        </div>

        <HintTooltip content="Creates your HGH WorkForce identity. You will sign in next to finish onboarding or open an invitation.">
          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-hgh-gold font-semibold text-hgh-navy transition-all hover:bg-hgh-gold/90 focus:outline-none focus:ring-2 focus:ring-hgh-gold focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-80"
          >
            {submitting ? (
              <>
                <AuthSubmitSpinner />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </button>
        </HintTooltip>
      </form>

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-hgh-border" />
        <span className="text-xs text-hgh-muted">Already have an account?</span>
        <div className="h-px flex-1 bg-hgh-border" />
      </div>

      <Link
        href="/sign-in"
        className="flex h-11 w-full items-center justify-center rounded-lg border border-hgh-border bg-white text-sm font-medium text-hgh-slate transition-all hover:border-hgh-gold/40 hover:bg-hgh-offwhite focus:outline-none focus:ring-2 focus:ring-hgh-gold focus:ring-offset-2"
      >
        Sign in instead
      </Link>
    </div>
  );
}
