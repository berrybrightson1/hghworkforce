"use client";

import { useState } from "react";
import { Clock, Coffee, PlusCircle, User, UserPlus } from "lucide-react";
import { useApi } from "@/lib/swr";
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { TimeSelect } from "@/components/ui/time-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { employeeDisplayName } from "@/lib/employee-display";
import { SHIFT_QUICK_PICKS, SHIFT_QUICK_PICK_CUSTOM } from "@/lib/shift-presets";

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

const BREAK_OPTIONS = [0, 15, 30, 45, 60, 90, 120] as const;
const defaultPick = SHIFT_QUICK_PICKS[0]!;

export default function ShiftsPage() {
  const { selected } = useCompany();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state - create shift
  const [quickPickId, setQuickPickId] = useState(defaultPick.id);
  const [name, setName] = useState(defaultPick.name);
  const [startTime, setStartTime] = useState(defaultPick.startTime);
  const [endTime, setEndTime] = useState(defaultPick.endTime);
  const [breakMins, setBreakMins] = useState(String(defaultPick.breakMinutes));

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
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Enter a shift name or pick a template.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selected.id,
          name: trimmedName,
          startTime,
          endTime,
          breakMinutes: (() => {
            const n = parseInt(breakMins, 10);
            return Number.isFinite(n) ? Math.min(180, Math.max(0, n)) : 60;
          })(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create shift");
      }
      toast.success(`Shift "${trimmedName}" created`);
      setQuickPickId(defaultPick.id);
      setName(defaultPick.name);
      setStartTime(defaultPick.startTime);
      setEndTime(defaultPick.endTime);
      setBreakMins(String(defaultPick.breakMinutes));
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
          <div className="mb-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-muted">
                Quick pick <span className="font-normal text-hgh-muted/80">(name &amp; times)</span>
              </label>
              <Select
                value={quickPickId}
                onValueChange={(id) => {
                  setQuickPickId(id);
                  if (id === SHIFT_QUICK_PICK_CUSTOM) return;
                  const p = SHIFT_QUICK_PICKS.find((x) => x.id === id);
                  if (p) {
                    setName(p.name);
                    setStartTime(p.startTime);
                    setEndTime(p.endTime);
                    setBreakMins(String(p.breakMinutes));
                  }
                }}
              >
                <SelectTrigger className="w-full max-w-xl text-left">
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(70vh,380px)]">
                  {SHIFT_QUICK_PICKS.map((p) => (
                    <SelectItem key={p.id} value={p.id} title={p.description}>
                      <span className="font-medium">{p.label}</span>
                      <span className="block text-xs text-hgh-muted">{p.description}</span>
                    </SelectItem>
                  ))}
                  <SelectItem value={SHIFT_QUICK_PICK_CUSTOM}>
                    <span className="font-medium">Custom</span>
                    <span className="block text-xs text-hgh-muted">Set name and times yourself</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-hgh-muted">
                Pick a template to auto-fill the row below, then adjust anything you need. Night shifts can end
                after midnight (e.g. 22:00–06:00).
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-hgh-muted">Shift name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Shown on rosters and reports"
                required
                aria-invalid={!name.trim() ? true : undefined}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-muted">Start time</label>
              <TimeSelect value={startTime} onChange={setStartTime} placeholder="Start" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-muted">End time</label>
              <TimeSelect value={endTime} onChange={setEndTime} placeholder="End" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-muted">Break</label>
              <Select
                value={breakMins}
                onValueChange={setBreakMins}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Minutes" />
                </SelectTrigger>
                <SelectContent>
                  {BREAK_OPTIONS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m === 0 ? "No break" : `${m} minutes`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <Select
                      value={assignEmployeeId || "__none__"}
                      onValueChange={(v) => setAssignEmployeeId(v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Select employee</SelectItem>
                        {employees?.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {employeeDisplayName(emp)} — {emp.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
