"use client";

import { useEffect, useState } from "react";
import { Landmark, Plus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { useCompany } from "@/components/company-context";
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
  employee?: {
    employeeCode: string;
    name?: string | null;
    department: string;
    user?: { name: string } | null;
  };
}

interface EmployeeOpt {
  id: string;
  employeeCode: string;
  name?: string | null;
  department: string;
  user?: { name: string; email: string } | null;
}

const statusBadge = {
  PENDING: "warning",
  ACTIVE: "success",
  COMPLETED: "default",
  CANCELLED: "danger",
} as const;

const schema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  type: z.enum(["LOAN", "ADVANCE"]),
  amount: z.coerce.number().positive("Amount is required"),
  monthlyRepayment: z.coerce.number().positive("Repayment is required"),
  disbursedAt: z.string().optional(),
  note: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function LoansPage() {
  const { selected } = useCompany();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [repaymentMonths, setRepaymentMonths] = useState("");

  const loansUrl = selected ? `/api/loans?companyId=${selected.id}` : null;
  const { data: loans, mutate } = useApi<Loan[]>(loansUrl);
  const empUrl = selected ? `/api/employees?companyId=${selected.id}&status=ACTIVE` : null;
  const { data: employees } = useApi<EmployeeOpt[]>(empUrl);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "LOAN", employeeId: "", disbursedAt: "" },
  });

  const watchedAmount = watch("amount");

  useEffect(() => {
    const mos = parseInt(repaymentMonths, 10);
    const mo = monthlyRepaymentFromTerm(Number(watchedAmount), mos);
    if (mo != null && mo > 0) {
      setValue("monthlyRepayment", mo, { shouldValidate: true, shouldDirty: true });
    }
  }, [watchedAmount, repaymentMonths, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error();
      toast.success("Loan created successfully.");
      reset();
      setRepaymentMonths("");
      setDialogOpen(false);
      mutate();
    } catch {
      toast.error("Failed to create loan.");
    } finally {
      setSubmitting(false);
    }
  });

  const list = loans ?? [];
  const empList = employees ?? [];
  const active = list.filter((l) => l.status === "ACTIVE");
  const totalOutstanding = active.reduce((sum, l) => sum + Number(l.balance), 0);
  const totalMonthly = active.reduce((sum, l) => sum + Number(l.monthlyRepayment), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">Loans &amp; Advances</h2>
          <p className="text-sm text-hgh-muted">
            {selected
              ? `Loans for ${selected.name}. Monthly repayments feed into payroll calculations.`
              : "Select a company to view and create loans."}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={!selected}>
          <Plus size={18} />
          New Loan
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-5 text-center">
            <p className="text-xs text-hgh-muted">Active Loans</p>
            <p className="mt-1 text-2xl font-semibold text-hgh-navy">{active.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5 text-center">
            <p className="text-xs text-hgh-muted">Total Outstanding</p>
            <p className="mt-1 text-2xl font-semibold text-hgh-navy">
              GHS {totalOutstanding.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5 text-center">
            <p className="text-xs text-hgh-muted">Monthly Repayments</p>
            <p className="mt-1 text-2xl font-semibold text-hgh-navy">
              GHS {totalMonthly.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Loans</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hgh-border text-left">
                <th className="px-5 py-3 font-medium text-hgh-muted">Employee</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">Type</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">Amount</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">Balance</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">Monthly</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {!selected ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-hgh-muted">
                    Select a company in the sidebar.
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-hgh-muted">
                    <Landmark size={32} className="mx-auto mb-3 text-hgh-border" />
                    <p>No loans or advances recorded.</p>
                  </td>
                </tr>
              ) : (
                list.map((loan) => (
                  <tr key={loan.id} className="border-b border-hgh-border last:border-0 hover:bg-hgh-offwhite/50">
                    <td className="px-5 py-3">
                      <span className="font-medium text-hgh-navy">
                        {loan.employee ? employeeDisplayName(loan.employee) : "—"}
                      </span>
                      {loan.employee && (
                        <span className="block text-xs text-hgh-muted">{loan.employee.employeeCode}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">{loan.type}</td>
                    <td className="px-5 py-3 tabular-nums">GHS {Number(loan.amount).toLocaleString()}</td>
                    <td className="px-5 py-3 tabular-nums">GHS {Number(loan.balance).toLocaleString()}</td>
                    <td className="px-5 py-3 tabular-nums">GHS {Number(loan.monthlyRepayment).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <Badge variant={statusBadge[loan.status]}>{loan.status}</Badge>
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
        title="New Loan / Advance"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="loan-employee">
              Employee <span className="text-hgh-danger">*</span>
            </label>
            <Controller
              name="employeeId"
              control={control}
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="loan-employee"
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-invalid={errors.employeeId ? "true" : undefined}
                  >
                    <SelectValue placeholder="Select employee…" />
                  </SelectTrigger>
                  <SelectContent>
                    {empList.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {employeeDisplayName(e)} — {e.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.employeeId && (
              <p className="mt-1 text-xs text-hgh-danger">{errors.employeeId.message}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="loan-type">
                Type
              </label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="loan-type" ref={field.ref} onBlur={field.onBlur}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOAN">Loan</SelectItem>
                      <SelectItem value="ADVANCE">Salary Advance</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">
                Amount (GHS) <span className="text-hgh-danger">*</span>
              </label>
              <Input type="number" step="0.01" placeholder="e.g. 5000" {...register("amount")} />
              {errors.amount && (
                <p className="mt-1 text-xs text-hgh-danger">{errors.amount.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="loan-term-mo">
                Repayment term (months)
              </label>
              <Input
                id="loan-term-mo"
                type="number"
                min={1}
                step={1}
                placeholder="Optional — fills monthly below"
                value={repaymentMonths}
                onChange={(e) => setRepaymentMonths(e.target.value)}
              />
              <p className="mt-1 text-xs text-hgh-muted">Amount ÷ months. You can still edit monthly repayment.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">
                Monthly Repayment (GHS) <span className="text-hgh-danger">*</span>
              </label>
              <Input type="number" step="0.01" placeholder="e.g. 500" {...register("monthlyRepayment")} />
              {errors.monthlyRepayment && (
                <p className="mt-1 text-xs text-hgh-danger">{errors.monthlyRepayment.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="loan-disbursed">
              Disbursed on
            </label>
            <Controller
              name="disbursedAt"
              control={control}
              render={({ field }) => (
                <DatePickerField
                  id="loan-disbursed"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Optional"
                />
              )}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate">Note</label>
            <Input placeholder="Optional note..." {...register("note")} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
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
            <Button type="submit" disabled={submitting || empList.length === 0}>
              {submitting ? "Creating..." : "Create Loan"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
