"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast/useToast";

const schema = z
  .object({
    employeeCode: z.string().min(1, "Employee code is required"),
    newPin: z.string().length(4).regex(/^\d+$/, "Digits only"),
    confirmPin: z.string().length(4).regex(/^\d+$/, "Digits only"),
  })
  .refine((d) => d.newPin === d.confirmPin, { message: "PINs must match", path: ["confirmPin"] });

type Form = z.infer<typeof schema>;

export default function PortalFirstPinPage() {
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { employeeCode: "", newPin: "", confirmPin: "" },
  });

  async function onSubmit(values: Form) {
    try {
      const res = await fetch("/api/portal/auth/initial-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeCode: values.employeeCode.trim(),
          newPin: values.newPin,
          confirmPin: values.confirmPin,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Could not create PIN");
        return;
      }
      toast.success("PIN created. Welcome to your portal.");
      router.push("/portal");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-hgh-border bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-hgh-navy">Create your PIN</h1>
        <p className="mt-1 text-sm text-hgh-muted">
          First time here? Enter your employee code and choose a 4-digit PIN. If HR gave you a
          temporary PIN, use{" "}
          <Link href="/portal/login" className="text-hgh-gold underline underline-offset-2">
            sign in
          </Link>{" "}
          instead.
        </p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
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
            <label htmlFor="newPin" className="text-sm font-medium text-hgh-navy">
              New PIN
            </label>
            <Input id="newPin" type="password" inputMode="numeric" maxLength={4} {...form.register("newPin")} />
            {form.formState.errors.newPin && (
              <p className="text-xs text-hgh-danger">{form.formState.errors.newPin.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPin" className="text-sm font-medium text-hgh-navy">
              Confirm PIN
            </label>
            <Input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              {...form.register("confirmPin")}
            />
            {form.formState.errors.confirmPin && (
              <p className="text-xs text-hgh-danger">{form.formState.errors.confirmPin.message}</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full bg-hgh-navy text-white hover:bg-hgh-navy/90"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Saving…" : "Save and continue"}
          </Button>
          <p className="text-center text-sm">
            <Link href="/portal/login" className="text-hgh-gold underline underline-offset-2">
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
