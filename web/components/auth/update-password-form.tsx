"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/components/toast/useToast";
import { createClient } from "@/lib/supabase/client";

const schema = z
  .object({
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don’t match",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

export function UpdatePasswordForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password updated. Signing you in…");
    router.push("/dashboard");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-hgh-slate">
          New password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? "true" : "false"}
          className="flex h-11 w-full rounded-lg border border-hgh-border bg-white px-4 text-sm text-hgh-slate shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold"
          {...register("password")}
        />
        {errors.password && <p className="mt-1.5 text-xs text-hgh-danger">{errors.password.message}</p>}
      </div>

      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-hgh-slate">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.confirm ? "true" : "false"}
          className="flex h-11 w-full rounded-lg border border-hgh-border bg-white px-4 text-sm text-hgh-slate shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold"
          {...register("confirm")}
        />
        {errors.confirm && <p className="mt-1.5 text-xs text-hgh-danger">{errors.confirm.message}</p>}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-hgh-gold font-semibold text-hgh-navy transition-all hover:bg-hgh-gold/90 focus:outline-none focus:ring-2 focus:ring-hgh-gold focus:ring-offset-2 disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Update password"}
      </button>

      <p className="text-center text-sm text-hgh-muted">
        <Link href="/sign-in" className="font-medium text-hgh-navy underline decoration-hgh-gold/50 underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
