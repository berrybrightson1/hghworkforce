"use client";

import { useState } from "react";
import Link from "next/link";
import { Banknote, Plus, FileText } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { DatePickerField } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { useApi } from "@/lib/swr";

interface Payrun {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  company?: { name: string };
  _count?: { lines: number };
}

const statusBadge = {
  DRAFT: "default",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
} as const;

const schema = z.object({
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  note: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function PayrollPage() {
  const { selected } = useCompany();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const url = selected ? `/api/payruns?companyId=${selected.id}` : null;
  const { data: payruns, mutate } = useApi<Payrun[]>(url);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { periodStart: "", periodEnd: "", note: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!selected) {
      toast.error("Select a company first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/payruns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, companyId: selected.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed");
      }
      toast.success("Pay run created as DRAFT.");
      reset();
      setDialogOpen(false);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create pay run.");
    } finally {
      setSubmitting(false);
    }
  });

  const list = payruns ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">Payroll</h2>
          <p className="text-sm text-hgh-muted">
            {selected ? `Pay runs for ${selected.name}` : "Select a company to manage payroll."}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={!selected}>
          <Plus size={18} />
          New Pay Run
        </Button>
      </div>

      {/* Workflow legend */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-3 text-xs text-hgh-muted">
          <span className="font-medium text-hgh-slate">Workflow:</span>
          <Badge variant="default">Draft</Badge>
          <span>&rarr;</span>
          <Badge variant="warning">Pending</Badge>
          <span>&rarr;</span>
          <Badge variant="success">Approved</Badge>
          <span className="text-hgh-border">|</span>
          <Badge variant="danger">Rejected</Badge>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pay Runs</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hgh-border text-left">
                <th className="px-5 py-3 font-medium text-hgh-muted">Period</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">Company</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">Employees</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">Status</th>
                <th className="px-5 py-3 font-medium text-hgh-muted"></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-hgh-muted">
                    <Banknote size={32} className="mx-auto mb-3 text-hgh-border" />
                    <p>No pay runs yet.</p>
                  </td>
                </tr>
              ) : (
                list.map((pr) => (
                  <tr key={pr.id} className="border-b border-hgh-border last:border-0 hover:bg-hgh-offwhite/50">
                    <td className="px-5 py-3">
                      {new Date(pr.periodStart).toLocaleDateString()} &ndash;{" "}
                      {new Date(pr.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">{pr.company?.name}</td>
                    <td className="px-5 py-3 tabular-nums">{pr._count?.lines ?? 0}</td>
                    <td className="px-5 py-3">
                      <Badge variant={statusBadge[pr.status]}>{pr.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/dashboard/payroll/${pr.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quick info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <FileText size={20} className="shrink-0 text-hgh-gold" />
            <div>
              <p className="text-sm font-medium text-hgh-navy">SSNIT Employee</p>
              <p className="text-xs text-hgh-muted">5.5% of basic salary</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <FileText size={20} className="shrink-0 text-hgh-gold" />
            <div>
              <p className="text-sm font-medium text-hgh-navy">SSNIT Employer</p>
              <p className="text-xs text-hgh-muted">13% of basic salary</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <FileText size={20} className="shrink-0 text-hgh-gold" />
            <div>
              <p className="text-sm font-medium text-hgh-navy">PAYE Tax</p>
              <p className="text-xs text-hgh-muted">Progressive GRA brackets</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Pay Run Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New Pay Run">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="payrun-period-start">
                Period Start <span className="text-hgh-danger">*</span>
              </label>
              <Controller
                name="periodStart"
                control={control}
                render={({ field }) => (
                  <DatePickerField
                    id="payrun-period-start"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Start date"
                    aria-invalid={errors.periodStart ? true : undefined}
                  />
                )}
              />
              {errors.periodStart && (
                <p className="mt-1 text-xs text-hgh-danger">{errors.periodStart.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="payrun-period-end">
                Period End <span className="text-hgh-danger">*</span>
              </label>
              <Controller
                name="periodEnd"
                control={control}
                render={({ field }) => (
                  <DatePickerField
                    id="payrun-period-end"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="End date"
                    aria-invalid={errors.periodEnd ? true : undefined}
                  />
                )}
              />
              {errors.periodEnd && (
                <p className="mt-1 text-xs text-hgh-danger">{errors.periodEnd.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate">Note</label>
            <Input placeholder="Optional note..." {...register("note")} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Pay Run"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
