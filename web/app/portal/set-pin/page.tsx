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
    newPin: z.string().length(4).regex(/^\d+$/),
    confirmPin: z.string().length(4).regex(/^\d+$/),
  })
  .refine((d) => d.newPin === d.confirmPin, { message: "PINs must match", path: ["confirmPin"] });

type Form = z.infer<typeof schema>;

export default function PortalSetPinPage() {
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { newPin: "", confirmPin: "" },
  });

  async function onSubmit(values: Form) {
    try {
      const res = await fetch("/api/portal/auth/set-pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPin: values.newPin, confirmPin: values.confirmPin }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error || "Could not set PIN");
        return;
      }
      toast.success("PIN set successfully. Welcome to your portal.");
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
        <p className="mt-1 text-sm text-hgh-muted">Choose a new 4-digit PIN and confirm it.</p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
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
            Save PIN
          </Button>
          <p className="text-center text-xs text-hgh-muted">
            You must complete this step before using the portal.
          </p>
          <p className="text-center text-sm">
            <Link href="/portal/login" className="text-hgh-gold underline underline-offset-2">
              Sign out and start over
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
