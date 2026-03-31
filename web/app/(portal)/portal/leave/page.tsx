"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
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

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  approvalNote?: string | null;
  rejectionNote?: string | null;
  employee?: {
    employeeCode: string;
    name?: string | null;
    department: string;
    user?: { name: string } | null;
  };
}

interface BalanceRow {
  type: string;
  entitled: number;
  used: number;
  remaining: number;
}

interface EmpBalanceSelf {
  employeeId: string;
  employeeCode: string;
  name?: string | null;
  balances: BalanceRow[];
}

interface MeEmployee {
  id: string;
  companyId: string;
  employeeCode: string;
  name?: string | null;
}

const statusBadge = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "default",
} as const;

const schema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  type: z.enum(["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "COMPASSIONATE", "UNPAID"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  days: z.coerce.number().int().positive("Must be at least 1 day"),
  note: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function PortalLeavePage() {
  const { selected } = useCompany();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"list" | "balances">("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: meEmployee } = useApi<MeEmployee>("/api/me/employee");
  const { data: requests, mutate } = useApi<LeaveRequest[]>("/api/leave");
  const balanceUrl =
    selected?.id != null
      ? `/api/leave/balances?companyId=${selected.id}`
      : `/api/leave/balances`;
  const { data: balanceSelf, mutate: mutateBalances } = useApi<EmpBalanceSelf>(balanceUrl);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "ANNUAL", employeeId: "", startDate: "", endDate: "", days: 1 },
  });

  useEffect(() => {
    if (meEmployee?.id) {
      reset((v) => ({ ...v, employeeId: meEmployee.id }));
    }
  }, [meEmployee?.id, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error();
      toast.success("Leave request submitted.");
      reset({
        employeeId: meEmployee?.id ?? "",
        type: values.type,
        startDate: "",
        endDate: "",
        days: 1,
        note: "",
      });
      setDialogOpen(false);
      mutate();
      mutateBalances();
    } catch {
      toast.error("Failed to create leave request.");
    } finally {
      setSubmitting(false);
    }
  });

  const list = requests ?? [];
  const balances = balanceSelf?.balances ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-hgh-navy">Leave</h1>
          <p className="mt-1 text-sm text-hgh-muted">
            Submit requests and track balances for your account.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={!meEmployee?.id}>
          <Plus size={18} />
          New request
        </Button>
      </div>

      <div className="flex flex-wrap border-b border-hgh-border">
        {(["list", "balances"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "border-b-2 border-hgh-navy text-hgh-navy"
                : "text-hgh-muted hover:text-hgh-navy"
            }`}
          >
            {tab === "list" ? "My requests" : "Balances"}
          </button>
        ))}
      </div>

      {activeTab === "list" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">My leave requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {list.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-hgh-muted">
                <CalendarDays size={36} className="mb-2 opacity-40" />
                <p className="text-sm">No requests yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-hgh-border">
                {list.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                    <div>
                      <p className="font-medium text-hgh-navy">{r.type}</p>
                      <p className="text-xs text-hgh-muted">
                        {new Date(r.startDate).toLocaleDateString()} –{" "}
                        {new Date(r.endDate).toLocaleDateString()} · {r.days} day(s)
                      </p>
                      {r.employee ? (
                        <p className="mt-1 text-xs text-hgh-muted">
                          {employeeDisplayName(r.employee)}
                        </p>
                      ) : null}
                      {r.status === "APPROVED" && r.approvalNote?.trim() ? (
                        <p className="mt-2 rounded-md border border-hgh-border/80 bg-hgh-offwhite/80 px-2.5 py-1.5 text-xs text-hgh-slate">
                          <span className="font-medium text-hgh-navy">HR note: </span>
                          {r.approvalNote.trim()}
                        </p>
                      ) : null}
                      {r.status === "REJECTED" && r.rejectionNote?.trim() ? (
                        <p className="mt-2 rounded-md border border-hgh-danger/25 bg-hgh-danger/5 px-2.5 py-1.5 text-xs text-hgh-slate">
                          <span className="font-medium text-hgh-danger">Reason: </span>
                          {r.rejectionNote.trim()}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant={statusBadge[r.status]}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leave balances</CardTitle>
            <p className="text-sm font-normal text-hgh-muted">
              Estimates from policy and approved leave. Your HR team sets the rules in the main dashboard.
            </p>
          </CardHeader>
          <CardContent>
            {balances.length === 0 ? (
              <p className="text-sm text-hgh-muted">No balance rows yet (policy may not be configured).</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hgh-border text-left">
                      <th className="pb-2 font-medium text-hgh-muted">Type</th>
                      <th className="pb-2 font-medium text-hgh-muted text-right">Entitled</th>
                      <th className="pb-2 font-medium text-hgh-muted text-right">Used</th>
                      <th className="pb-2 font-medium text-hgh-muted text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map((b) => (
                      <tr key={b.type} className="border-b border-hgh-border/80">
                        <td className="py-2 font-medium text-hgh-navy">{b.type}</td>
                        <td className="py-2 text-right tabular-nums">{b.entitled}</td>
                        <td className="py-2 text-right tabular-nums">{b.used}</td>
                        <td className="py-2 text-right tabular-nums">{b.remaining}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New leave request">
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" {...register("employeeId")} />
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="portal-leave-type">
              Leave type
            </label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="portal-leave-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANNUAL">Annual</SelectItem>
                    <SelectItem value="SICK">Sick</SelectItem>
                    <SelectItem value="MATERNITY">Maternity</SelectItem>
                    <SelectItem value="PATERNITY">Paternity</SelectItem>
                    <SelectItem value="COMPASSIONATE">Compassionate</SelectItem>
                    <SelectItem value="UNPAID">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="portal-leave-start">
                Start date
              </label>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <DatePickerField
                    id="portal-leave-start"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Start"
                    aria-invalid={errors.startDate ? true : undefined}
                  />
                )}
              />
              {errors.startDate ? (
                <p className="mt-1 text-xs text-hgh-danger">{errors.startDate.message}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="portal-leave-end">
                End date
              </label>
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <DatePickerField
                    id="portal-leave-end"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="End"
                    aria-invalid={errors.endDate ? true : undefined}
                  />
                )}
              />
              {errors.endDate ? (
                <p className="mt-1 text-xs text-hgh-danger">{errors.endDate.message}</p>
              ) : null}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="portal-leave-days">
              Days
            </label>
            <Input
              id="portal-leave-days"
              type="number"
              min={1}
              {...register("days", { valueAsNumber: true })}
            />
            {errors.days ? (
              <p className="mt-1 text-xs text-hgh-danger">{errors.days.message}</p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="portal-leave-note">
              Note (optional)
            </label>
            <Input id="portal-leave-note" {...register("note")} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
