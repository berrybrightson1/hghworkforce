"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast/useToast";

const schema = z.object({
  employeeCode: z.string().min(1, "Employee code is required"),
  pin: z
    .string()
    .length(4, "PIN must be 4 digits")
    .regex(/^\d+$/, "Digits only"),
});

type Form = z.infer<typeof schema>;

export function PortalLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const next = params.get("next") || "/portal";

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { employeeCode: "", pin: "" },
  });

  async function onSubmit(values: Form) {
    try {
      const res = await fetch("/api/portal/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeCode: values.employeeCode.trim(),
          pin: values.pin,
        }),
      });
      const data = (await res.json()) as { error?: string; requiresPinChange?: boolean; redirect?: string };
      if (!res.ok) {
        toast.error(data.error || "Invalid employee code or PIN");
        return;
      }
      if (data.requiresPinChange) {
        router.push("/portal/set-pin");
        router.refresh();
        return;
      }
      router.push(data.redirect || next);
      router.refresh();
    } catch {
      toast.error("Could not sign in. Try again.");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="employeeCode" className="text-sm font-medium text-hgh-navy">
          Employee code
        </label>
        <Input
          id="employeeCode"
          autoComplete="username"
          className="font-mono uppercase"
          {...form.register("employeeCode")}
        />
        {form.formState.errors.employeeCode && (
          <p className="text-xs text-hgh-danger">{form.formState.errors.employeeCode.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <label htmlFor="pin" className="text-sm font-medium text-hgh-navy">
          PIN
        </label>
        <Input
          id="pin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          autoComplete="current-password"
          placeholder="4 digits"
          {...form.register("pin")}
        />
        {form.formState.errors.pin && (
          <p className="text-xs text-hgh-danger">{form.formState.errors.pin.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full bg-hgh-navy text-white hover:bg-hgh-navy/90" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm">
        <Link href="/portal/forgot-pin" className="text-hgh-gold underline underline-offset-2 hover:text-hgh-gold-light">
          Forgot PIN?
        </Link>
        {" · "}
        <Link href="/portal/first-pin" className="text-hgh-gold underline underline-offset-2 hover:text-hgh-gold-light">
          First time? Create your PIN
        </Link>
      </p>
    </form>
  );
}
