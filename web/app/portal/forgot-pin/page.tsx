"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast/useToast";

const schema = z.object({
  employeeCode: z.string().min(1, "Employee code is required"),
});

type Form = z.infer<typeof schema>;

export default function PortalForgotPinPage() {
  const { toast } = useToast();
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { employeeCode: "" },
  });

  async function onSubmit(values: Form) {
    try {
      const res = await fetch("/api/portal/auth/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeCode: values.employeeCode.trim() }),
      });
      const data = (await res.json()) as { message?: string };
      toast.info(data.message || "Request received.");
      form.reset();
    } catch {
      toast.error("Something went wrong.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-hgh-border bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-hgh-navy">Forgot PIN</h1>
        <p className="mt-1 text-sm text-hgh-muted">
          Enter your employee code. We will never confirm whether a code exists in the system.
        </p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="employeeCode" className="text-sm font-medium text-hgh-navy">
              Employee code
            </label>
            <Input
              id="employeeCode"
              className="uppercase"
              {...form.register("employeeCode", {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
            />
            {form.formState.errors.employeeCode && (
              <p className="text-xs text-hgh-danger">{form.formState.errors.employeeCode.message}</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full bg-hgh-navy text-white hover:bg-hgh-navy/90"
            disabled={form.formState.isSubmitting}
          >
            Submit
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
