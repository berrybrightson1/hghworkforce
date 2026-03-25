"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/components/toast/useToast";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectTo = `${origin}/auth/callback?next=/update-password`;

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSent(true);
    toast.success("Check your email for a reset link.");
  });

  if (sent) {
    return (
      <div className="rounded-lg border border-hgh-border bg-white p-6 text-center text-sm text-hgh-slate">
        <p>If an account exists for that email, we sent a link to reset your password.</p>
        <p className="mt-2 text-hgh-muted">Didn&apos;t get it? Check spam or try again in a few minutes.</p>
        <Link
          href="/sign-in"
          className="mt-4 inline-block text-sm font-medium text-hgh-gold hover:text-hgh-gold/80"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-hgh-slate">
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
        {errors.email && <p className="mt-1.5 text-xs text-hgh-danger">{errors.email.message}</p>}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-hgh-gold font-semibold text-hgh-navy transition-all hover:bg-hgh-gold/90 focus:outline-none focus:ring-2 focus:ring-hgh-gold focus:ring-offset-2 disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-hgh-muted">
        <Link href="/sign-in" className="font-medium text-hgh-navy underline decoration-hgh-gold/50 underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
