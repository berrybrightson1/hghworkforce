"use client";

import { useState } from "react";
import { Clock, Coffee, PlusCircle, User, UserPlus } from "lucide-react";
import { useApi } from "@/lib/swr";
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { employeeDisplayName } from "@/lib/employee-display";

type Employee = {
  id: string;
  employeeCode: string;
  name?: string | null;
  department: string;
  jobTitle: string;
  user?: { name: string } | null;
};

type ShiftAssignment = {
  id: string;
  startDate: string;
  endDate: string | null;
  employee: Employee;
};

type Shift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  status: "ACTIVE" | "INACTIVE";
  assignments: ShiftAssignment[];
  _count: { assignments: number };
};

export default function ShiftsPage() {
  const { selected } = useCompany();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state - create shift
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [breakMins, setBreakMins] = useState("60");

  // Form state - assign employee
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assignStartDate, setAssignStartDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );

  const shiftsUrl = selected ? `/api/shifts?companyId=${selected.id}` : null;
  const { data: shifts, isLoading, mutate } = useApi<Shift[]>(shiftsUrl);

  const employeesUrl = selected ? `/api/employees?companyId=${selected.id}` : null;
  const { data: employees } = useApi<Employee[]>(employeesUrl);

  async function handleCreateShift(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setCreating(true);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selected.id,
          name,
          startTime,
          endTime,
          breakMinutes: parseInt(breakMins, 10) || 60,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create shift");
      }
      toast.success(`Shift "${name}" created`);
      setName("");
      setStartTime("08:00");
      setEndTime("17:00");
      setBreakMins("60");
      setShowCreate(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  async function handleAssignEmployee(shiftId: string) {
    if (!assignEmployeeId || !assignStartDate) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/shifts/${shiftId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: assignEmployeeId,
          startDate: assignStartDate,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to assign employee");
      }
      toast.success("Employee assigned to shift");
      setShowAssign(null);
      setAssignEmployeeId("");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  if (!selected) {
    return (
      <div className="flex h-64 items-center justify-center text-hgh-muted">
        <p>Select a company to manage shifts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-hgh-navy">Shift Management</h2>
          <p className="text-sm text-hgh-muted">Create shifts and assign employees to rosters</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="inline-flex items-center gap-2">
          <PlusCircle className="h-[18px] w-[18px]" aria-hidden />
          New Shift
        </Button>
      </div>

      {/* Create shift form */}
      {showCreate && (
        <form
          onSubmit={handleCreateShift}
          className="rounded-xl border border-hgh-gold/20 bg-white p-6"
        >
          <h3 className="mb-4 text-sm font-semibold text-hgh-navy">Create Shift Template</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-muted">Shift Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Morning"
                required
                className="w-full rounded-lg border border-hgh-border px-3 py-2 text-sm focus:border-hgh-gold focus:outline-none focus:ring-1 focus:ring-hgh-gold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-muted">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full rounded-lg border border-hgh-border px-3 py-2 text-sm focus:border-hgh-gold focus:outline-none focus:ring-1 focus:ring-hgh-gold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-muted">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full rounded-lg border border-hgh-border px-3 py-2 text-sm focus:border-hgh-gold focus:outline-none focus:ring-1 focus:ring-hgh-gold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-muted">
                Break (minutes)
              </label>
              <input
                type="number"
                value={breakMins}
                onChange={(e) => setBreakMins(e.target.value)}
                min={0}
                max={180}
                className="w-full rounded-lg border border-hgh-border px-3 py-2 text-sm focus:border-hgh-gold focus:outline-none focus:ring-1 focus:ring-hgh-gold"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Shift"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Shifts list */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-hgh-muted">Loading shifts...</div>
      ) : !shifts || shifts.length === 0 ? (
        <div className="rounded-xl border border-hgh-border bg-white py-16 text-center">
          <Clock className="mx-auto mb-3 block h-12 w-12 text-hgh-border" strokeWidth={1.25} aria-hidden />
          <p className="text-sm font-medium text-hgh-navy">No shifts created yet</p>
          <p className="mt-1 text-sm text-hgh-muted">
            Create a shift template to start assigning employees.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="rounded-xl border border-hgh-border bg-white transition-colors hover:border-hgh-gold/30"
            >
              <div className="border-b border-hgh-border p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-hgh-navy">{shift.name}</h3>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      shift.status === "ACTIVE"
                        ? "bg-hgh-success/10 text-hgh-success"
                        : "bg-hgh-muted/10 text-hgh-muted",
                    )}
                  >
                    {shift.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm text-hgh-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4 shrink-0" aria-hidden />
                    {shift.startTime} - {shift.endTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Coffee className="h-4 w-4 shrink-0" aria-hidden />
                    {shift.breakMinutes}m break
                  </span>
                </div>
                <div className="mt-2 text-xs text-hgh-muted">
                  {shift._count.assignments} employee{shift._count.assignments !== 1 ? "s" : ""} assigned
                </div>
              </div>

              {/* Assigned employees */}
              <div className="p-4">
                {shift.assignments.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {shift.assignments.slice(0, 5).map((a) => (
                      <div key={a.id} className="flex items-center gap-2 text-sm">
                        <User className="h-3.5 w-3.5 shrink-0 text-hgh-gold" aria-hidden />
                        <span className="text-hgh-slate">{employeeDisplayName(a.employee)}</span>
                        <span className="text-xs text-hgh-muted">
                          · {a.employee.employeeCode} · {a.employee.department}
                        </span>
                      </div>
                    ))}
                    {shift.assignments.length > 5 && (
                      <p className="text-xs text-hgh-muted">
                        +{shift.assignments.length - 5} more
                      </p>
                    )}
                  </div>
                )}

                {showAssign === shift.id ? (
                  <div className="space-y-3 rounded-lg border border-hgh-border bg-hgh-offwhite p-3">
                    <select
                      value={assignEmployeeId}
                      onChange={(e) => setAssignEmployeeId(e.target.value)}
                      className="w-full rounded-lg border border-hgh-border bg-white px-3 py-2 text-sm focus:border-hgh-gold focus:outline-none"
                    >
                      <option value="">Select employee</option>
                      {employees?.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {employeeDisplayName(emp)} - {emp.department}
                        </option>
                      ))}
                    </select>
                    <DatePickerField
                      value={assignStartDate}
                      onChange={setAssignStartDate}
                      placeholder="Start date"
                      className="w-full max-w-none min-w-0"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={!assignEmployeeId || creating}
                        onClick={() => handleAssignEmployee(shift.id)}
                      >
                        {creating ? "Assigning..." : "Assign"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowAssign(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => setShowAssign(shift.id)}
                  >
                    <UserPlus className="h-4 w-4" aria-hidden />
                    Assign Employee
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
