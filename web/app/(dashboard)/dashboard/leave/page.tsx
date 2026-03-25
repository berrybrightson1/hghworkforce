"use client";

import { useState } from "react";
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
import { LeaveCalendar } from "@/components/dashboard/LeaveCalendar";

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  employee?: {
    employeeCode: string;
    name?: string | null;
    department: string;
    user?: { name: string } | null;
  };
}

interface Balance {
  type: string;
  entitled: number;
  used: number;
  remaining: number;
}

interface EmpBalance {
  employeeId: string;
  employeeCode: string;
  name?: string | null;
  user?: { name: string } | null;
  balances: Balance[];
}

interface EmployeeOpt {
  id: string;
  employeeCode: string;
  name?: string | null;
  department: string;
  user?: { name: string; email: string } | null;
}

interface Me {
  role: string;
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

export default function LeavePage() {
  const { selected } = useCompany();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"list" | "calendar" | "balances">("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const leaveUrl = selected ? `/api/leave?companyId=${selected.id}` : null;
  const { data: requests, mutate } = useApi<LeaveRequest[]>(leaveUrl);
  const balanceUrl = selected ? `/api/leave/balances?companyId=${selected.id}` : null;
  const { data: balances } = useApi<EmpBalance[]>(balanceUrl);
  const empUrl = selected ? `/api/employees?companyId=${selected.id}&status=ACTIVE` : null;
  const { data: employees } = useApi<EmployeeOpt[]>(empUrl);
  const { data: me } = useApi<Me>("/api/me");

  const canReview =
    me &&
    (me.role === "SUPER_ADMIN" || me.role === "COMPANY_ADMIN" || me.role === "HR");

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "ANNUAL", employeeId: "", startDate: "", endDate: "" },
  });

  const selectedEmpId = watch("employeeId");
  const selectedEmpBalances = balances?.find((b) => b.employeeId === selectedEmpId)?.balances || [];

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error();
      toast.success("Leave request created.");
      reset();
      setDialogOpen(false);
      mutate();
    } catch {
      toast.error("Failed to create leave request.");
    } finally {
      setSubmitting(false);
    }
  });

  async function patchLeave(id: string, status: "APPROVED" | "REJECTED") {
    setActingId(id);
    try {
      const res = await fetch(`/api/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(status === "APPROVED" ? "Leave approved." : "Leave rejected.");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setActingId(null);
    }
  }

  const list = requests ?? [];
  const empList = employees ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">Leave Management</h2>
          <p className="text-sm text-hgh-muted">
            {selected
              ? `Requests for ${selected.name}.`
              : "Select a company in the sidebar to filter leave."}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={!selected}>
          <Plus size={18} />
          New Request
        </Button>
      </div>

      <div className="flex border-b border-hgh-border">
        {(["list", "calendar", "balances"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "border-b-2 border-hgh-navy text-hgh-navy"
                : "text-hgh-muted hover:text-hgh-navy"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "calendar" && <LeaveCalendar requests={requests || []} />}

      {activeTab === "balances" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(balances || []).map((emp) => (
            <Card key={emp.employeeId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {employeeDisplayName({
                    employeeCode: emp.employeeCode,
                    name: emp.name,
                    user: emp.user ?? null,
                  })}
                </CardTitle>
                <p className="text-xs text-hgh-muted">{emp.employeeCode}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {emp.balances.map((b) => (
                    <div key={b.type} className="flex items-center justify-between text-xs">
                      <span className="text-hgh-muted">{b.type}</span>
                      <span className="font-medium text-hgh-navy">
                        {b.remaining} / {b.entitled} days
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "list" && (
        <Card>
          <CardHeader>
            <CardTitle>Leave Requests</CardTitle>
          </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hgh-border text-left">
                <th className="px-5 py-3 font-medium text-hgh-muted">Employee</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">Type</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">Start</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">End</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">Days</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">Status</th>
                {canReview && <th className="px-5 py-3 font-medium text-hgh-muted">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {!selected ? (
                <tr>
                  <td colSpan={canReview ? 7 : 6} className="px-5 py-12 text-center text-hgh-muted">
                    Select a company to view leave for that organisation.
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={canReview ? 7 : 6} className="px-5 py-12 text-center text-hgh-muted">
                    <CalendarDays size={32} className="mx-auto mb-3 text-hgh-border" />
                    <p>No leave requests found.</p>
                  </td>
                </tr>
              ) : (
                list.map((lr) => (
                  <tr key={lr.id} className="border-b border-hgh-border last:border-0 hover:bg-hgh-offwhite/50">
                    <td className="px-5 py-3">
                      <span className="font-medium text-hgh-navy">
                        {lr.employee ? employeeDisplayName(lr.employee) : "—"}
                      </span>
                      {lr.employee && (
                        <span className="block text-xs text-hgh-muted">{lr.employee.employeeCode}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">{lr.type}</td>
                    <td className="px-5 py-3">{new Date(lr.startDate).toLocaleDateString()}</td>
                    <td className="px-5 py-3">{new Date(lr.endDate).toLocaleDateString()}</td>
                    <td className="px-5 py-3 tabular-nums">{lr.days}</td>
                    <td className="px-5 py-3">
                      <Badge variant={statusBadge[lr.status]}>{lr.status}</Badge>
                    </td>
                    {canReview && (
                      <td className="px-5 py-3">
                        {lr.status === "PENDING" ? (
                          <div className="flex flex-wrap gap-1">
                            <Button
                              size="sm"
                              className="bg-emerald-600 text-white hover:bg-emerald-700"
                              disabled={actingId !== null}
                              onClick={() => patchLeave(lr.id, "APPROVED")}
                            >
                              {actingId === lr.id ? "…" : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={actingId !== null}
                              onClick={() => patchLeave(lr.id, "REJECTED")}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-hgh-muted">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New Leave Request">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="leave-employee">
              Employee <span className="text-hgh-danger">*</span>
            </label>
            <Controller
              name="employeeId"
              control={control}
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="leave-employee"
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
              <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="leave-type">
                Leave Type
              </label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="leave-type" ref={field.ref} onBlur={field.onBlur}>
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
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">
                Days <span className="text-hgh-danger">*</span>
              </label>
              <Input type="number" placeholder="e.g. 5" {...register("days")} />
              {errors.days && (
                <p className="mt-1 text-xs text-hgh-danger">{errors.days.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="leave-start">
                Start Date
              </label>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <DatePickerField
                    id="leave-start"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Start date"
                    aria-invalid={errors.startDate ? true : undefined}
                  />
                )}
              />
              {errors.startDate && (
                <p className="mt-1 text-xs text-hgh-danger">{errors.startDate.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="leave-end">
                End Date
              </label>
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <DatePickerField
                    id="leave-end"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="End date"
                    aria-invalid={errors.endDate ? true : undefined}
                  />
                )}
              />
              {errors.endDate && (
                <p className="mt-1 text-xs text-hgh-danger">{errors.endDate.message}</p>
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
            <Button type="submit" disabled={submitting || empList.length === 0}>
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
