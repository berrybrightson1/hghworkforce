"use client";

import { useEffect, useState } from "react";
import { Landmark, Plus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/toast/useToast";
import { useApi } from "@/lib/swr";
import { employeeDisplayName } from "@/lib/employee-display";
import { monthlyRepaymentFromTerm } from "@/lib/utils";

interface Loan {
  id: string;
  type: "LOAN" | "ADVANCE";
  amount: string;
  balance: string;
  monthlyRepayment: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  note?: string | null;
  employee?: {
    employeeCode: string;
    name?: string | null;
    department: string;
    user?: { name: string } | null;
  };
}

const statusBadge = {
  PENDING: "warning",
  ACTIVE: "success",
  COMPLETED: "default",
  CANCELLED: "danger",
} as const;

const requestSchema = z.object({
  type: z.enum(["LOAN", "ADVANCE"]),
  amount: z.coerce.number().positive(),
  monthlyRepayment: z.coerce.number().positive(),
  note: z.string().max(500).optional(),
});
type RequestForm = z.infer<typeof requestSchema>;

export default function PortalLoansPage() {
  const { toast } = useToast();
  const { data: loans, mutate } = useApi<Loan[]>("/api/loans");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [repaymentMonths, setRepaymentMonths] = useState("");

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { type: "ADVANCE", amount: 0, monthlyRepayment: 0 },
  });

  const watchedAmount = watch("amount");

  useEffect(() => {
    const mos = parseInt(repaymentMonths, 10);
    const mo = monthlyRepaymentFromTerm(Number(watchedAmount), mos);
    if (mo != null && mo > 0) {
      setValue("monthlyRepayment", mo, { shouldValidate: true, shouldDirty: true });
    }
  }, [watchedAmount, repaymentMonths, setValue]);

  const list = loans ?? [];
  const active = list.filter((l) => l.status === "ACTIVE");
  const pending = list.filter((l) => l.status === "PENDING");
  const totalOutstanding = active.reduce((sum, l) => sum + Number(l.balance), 0);
  const totalMonthly = active.reduce((sum, l) => sum + Number(l.monthlyRepayment), 0);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/me/loan-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Request submitted. HR will review it.");
      reset({ type: "ADVANCE", amount: 0, monthlyRepayment: 0 });
      setRepaymentMonths("");
      setDialogOpen(false);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-hgh-navy">Loans &amp; advances</h1>
          <p className="mt-1 text-sm text-hgh-muted">
            Request an advance or loan. Repayments run through payroll once approved.
          </p>
        </div>
        <Button type="button" onClick={() => setDialogOpen(true)}>
          <Plus size={18} />
          New request
        </Button>
      </div>

      {pending.length > 0 ? (
        <p className="text-sm text-hgh-gold">
          You have {pending.length} request(s) waiting for approval.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-5 text-center">
            <p className="text-xs text-hgh-muted">Active</p>
            <p className="mt-1 text-2xl font-semibold text-hgh-navy">{active.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5 text-center">
            <p className="text-xs text-hgh-muted">Outstanding balance</p>
            <p className="mt-1 text-2xl font-semibold text-hgh-navy">
              GHS {totalOutstanding.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5 text-center">
            <p className="text-xs text-hgh-muted">Monthly repayment</p>
            <p className="mt-1 text-2xl font-semibold text-hgh-navy">
              GHS {totalMonthly.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your loans</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hgh-border text-left">
                <th className="px-4 py-3 font-medium text-hgh-muted">Type</th>
                <th className="px-4 py-3 font-medium text-hgh-muted">Amount</th>
                <th className="px-4 py-3 font-medium text-hgh-muted">Balance</th>
                <th className="px-4 py-3 font-medium text-hgh-muted">Monthly</th>
                <th className="px-4 py-3 font-medium text-hgh-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-hgh-muted">
                    <Landmark size={32} className="mx-auto mb-3 text-hgh-border" />
                    <p>No loans on file.</p>
                  </td>
                </tr>
              ) : (
                list.map((loan) => (
                  <tr
                    key={loan.id}
                    className="border-b border-hgh-border last:border-0 hover:bg-hgh-offwhite/50"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-hgh-navy">{loan.type}</span>
                      {loan.employee ? (
                        <span className="mt-0.5 block text-xs text-hgh-muted">
                          {employeeDisplayName(loan.employee)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      GHS {Number(loan.amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      GHS {Number(loan.balance).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      GHS {Number(loan.monthlyRepayment).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadge[loan.status] ?? "default"}>{loan.status}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setRepaymentMonths("");
        }}
        title="Loan / advance request"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate">Type</label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADVANCE">Advance</SelectItem>
                    <SelectItem value="LOAN">Loan</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate">Amount (GHS)</label>
            <Input type="number" step="0.01" min={0} {...register("amount")} />
            {errors.amount ? (
              <p className="mt-1 text-xs text-hgh-danger">{errors.amount.message}</p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="portal-loan-term">
                Repayment term (months)
              </label>
              <Input
                id="portal-loan-term"
                type="number"
                min={1}
                step={1}
                placeholder="Optional — fills monthly"
                value={repaymentMonths}
                onChange={(e) => setRepaymentMonths(e.target.value)}
              />
              <p className="mt-1 text-xs text-hgh-muted">Amount ÷ months. You can still edit monthly repayment.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">Monthly repayment (GHS)</label>
              <Input type="number" step="0.01" min={0} {...register("monthlyRepayment")} />
              {errors.monthlyRepayment ? (
                <p className="mt-1 text-xs text-hgh-danger">{errors.monthlyRepayment.message}</p>
              ) : null}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate">Note (optional)</label>
            <Input {...register("note")} />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDialogOpen(false);
                setRepaymentMonths("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
