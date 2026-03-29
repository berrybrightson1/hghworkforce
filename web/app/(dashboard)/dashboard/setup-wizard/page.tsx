"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  ListChecks,
  Clock,
  UserPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerField } from "@/components/ui/date-picker";
import { TimeSelect } from "@/components/ui/time-select";
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { useApi } from "@/lib/swr";
import { cn } from "@/lib/utils";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import type { UserRole } from "@prisma/client";

type WizardStep = "company" | "employee" | "shifts" | "done";

const STEPS: { key: WizardStep; label: string; icon: typeof Building2 }[] = [
  { key: "company", label: "Workspace", icon: Building2 },
  { key: "employee", label: "Employee", icon: UserPlus },
  { key: "shifts", label: "Shift", icon: Clock },
];

const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  department: z.string().min(1, "Department is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  basicSalary: z.coerce.number().positive("Must be greater than 0"),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACTOR"]),
  startDate: z.string().min(1, "Start date is required"),
});

type EmployeeForm = z.infer<typeof employeeSchema>;

const hhmm = z
  .string()
  .min(1)
  .transform((s) => (s.length >= 5 ? s.slice(0, 5) : s))
  .pipe(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm"));

const shiftSchema = z.object({
  name: z.string().min(1, "Shift name is required"),
  startTime: hhmm,
  endTime: hhmm,
  breakMinutes: z.coerce.number().min(0).max(180),
});

type ShiftForm = z.infer<typeof shiftSchema>;

export default function SetupWizardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { selected, companies, select, loading: companiesLoading, mutate: refreshCompanies } = useCompany();
  const { data: me } = useApi<{ role: UserRole }>("/api/me");

  const [step, setStep] = useState<WizardStep>("company");
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeCode, setEmployeeCode] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [shiftId, setShiftId] = useState<string | null>(null);

  const [newCompanyName, setNewCompanyName] = useState("");
  const [creatingCompany, setCreatingCompany] = useState(false);

  const isSuper = me?.role === "SUPER_ADMIN";
  const canRunWizard =
    me?.role === "SUPER_ADMIN" || me?.role === "COMPANY_ADMIN" || me?.role === "HR";

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const activeIndex = step === "done" ? STEPS.length : Math.max(0, stepIndex);

  const empForm = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employmentType: "FULL_TIME",
      startDate: new Date().toISOString().split("T")[0],
    },
  });

  const shiftForm = useForm<ShiftForm>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      name: "Default office shift",
      startTime: "09:00",
      endTime: "17:00",
      breakMinutes: 60,
    },
  });

  const companyId = selected?.id ?? null;

  const createCompany = useCallback(async () => {
    if (!newCompanyName.trim()) {
      toast.error("Enter a company name.");
      return;
    }
    setCreatingCompany(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCompanyName.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(typeof data?.error === "string" ? data.error : "Could not create company");
        return;
      }
      select(data.id);
      await refreshCompanies();
      setNewCompanyName("");
      toast.success("Company created. Continue below.");
    } finally {
      setCreatingCompany(false);
    }
  }, [newCompanyName, select, refreshCompanies, toast]);

  const onCreateEmployee = empForm.handleSubmit(async (values) => {
    if (!companyId) return;
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, companyId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to create employee");
      }
      setEmployeeId(String(data.id));
      setEmployeeCode(String(data.employeeCode ?? ""));
      setEmployeeName(String(data.name ?? values.name));
      toast.success(`${values.name} added · code ${data.employeeCode ?? ""}`);
      setStep("shifts");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create employee");
    }
  });

  const onCreateShift = shiftForm.handleSubmit(async (values) => {
    if (!companyId || !employeeId) return;
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          name: values.name,
          startTime: values.startTime,
          endTime: values.endTime,
          breakMinutes: values.breakMinutes,
        }),
      });
      const shift = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(typeof shift?.error === "string" ? shift.error : "Failed to create shift");
      }
      const startDate = new Date().toISOString().slice(0, 10);
      const assignRes = await fetch(`/api/shifts/${shift.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, startDate }),
      });
      if (!assignRes.ok) {
        const err = await assignRes.json().catch(() => ({}));
        throw new Error(typeof err?.error === "string" ? err.error : "Shift created but assignment failed");
      }
      setShiftId(String(shift.id));
      toast.success("Shift created and assigned.");
      setStep("done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  });

  const progressLine = useMemo(
    () => (
      <ol className="flex flex-wrap items-center gap-2 text-xs font-medium text-hgh-muted sm:gap-4">
        {STEPS.map((s, i) => {
          const done = i < activeIndex;
          const current = i === activeIndex && step !== "done";
          return (
            <li key={s.key} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1",
                  done && "bg-hgh-success/10 text-hgh-success ring-hgh-success/25",
                  current && "bg-hgh-gold/15 text-hgh-navy ring-hgh-gold/40",
                  !done && !current && "bg-hgh-offwhite ring-hgh-border",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : <s.icon className="h-3.5 w-3.5" aria-hidden />}
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    ),
    [activeIndex, step],
  );

  if (!canRunWizard) {
    return (
      <div className="rounded-xl border border-hgh-border bg-white p-8 text-center text-sm text-hgh-muted">
        This guided setup is for workspace administrators. Use the portal for day-to-day tasks.
        <div className="mt-4">
          <HintTooltip content="Return to the dashboard home.">
            <Button variant="secondary" onClick={() => router.push("/dashboard")}>
              Back to overview
            </Button>
          </HintTooltip>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-hgh-navy">
            <ListChecks className="h-6 w-6 text-hgh-gold" aria-hidden />
            Setup wizard
          </h2>
          <p className="mt-1 text-sm text-hgh-muted">
            Walk through workspace → first employee → shift in one flow.
          </p>
        </div>
        <HintTooltip content="Leave the wizard and go to the dashboard. Progress in this session may be lost if you haven’t finished steps.">
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Exit wizard
          </Link>
        </HintTooltip>
      </div>

      {progressLine}

      {step === "company" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 size={18} className="text-hgh-gold" />
              1. Choose your workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {companiesLoading ? (
              <p className="text-hgh-muted">Loading companies…</p>
            ) : (
              <>
                {isSuper && companies.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-hgh-muted">Active company</label>
                    <Select
                      value={selected?.id ?? ""}
                      onValueChange={(id) => select(id)}
                    >
                      <SelectTrigger className="w-full max-w-md">
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-hgh-muted">Same list as the sidebar switcher.</p>
                  </div>
                )}

                {isSuper && (
                  <div className="rounded-lg border border-dashed border-hgh-border bg-hgh-offwhite/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-hgh-muted">Or create new (super admin)</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Input
                        placeholder="Company name"
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        className="max-w-xs"
                      />
                      <HintTooltip content="Adds a new company workspace. Only super admins can do this from the wizard.">
                        <Button type="button" variant="secondary" disabled={creatingCompany} onClick={() => void createCompany()}>
                          {creatingCompany ? "Creating…" : "Create company"}
                        </Button>
                      </HintTooltip>
                    </div>
                  </div>
                )}

                {!isSuper && selected && (
                  <p>
                    You&apos;re setting up <strong className="text-hgh-navy">{selected.name}</strong>.
                  </p>
                )}

                <HintTooltip content="Once a company is selected, move on to add the first employee for this flow.">
                  <Button
                    disabled={!companyId}
                    onClick={() => setStep("employee")}
                    className="mt-2"
                  >
                    Continue to employee
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </HintTooltip>
                {!companyId && (
                  <p className="text-xs text-hgh-danger">
                    {isSuper ? "Select or create a company first." : "No company on your account — complete onboarding."}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {step === "employee" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus size={18} className="text-hgh-gold" />
              2. Add your first employee (this session)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreateEmployee} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-hgh-slate">Name</label>
                  <Input placeholder="e.g. Kwame Mensah" {...empForm.register("name")} />
                  {empForm.formState.errors.name && (
                    <p className="mt-1 text-xs text-hgh-danger">{empForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-hgh-slate">Department</label>
                  <Input placeholder="Operations" {...empForm.register("department")} />
                  {empForm.formState.errors.department && (
                    <p className="mt-1 text-xs text-hgh-danger">{empForm.formState.errors.department.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-hgh-slate">Job title</label>
                  <Input placeholder="Analyst" {...empForm.register("jobTitle")} />
                  {empForm.formState.errors.jobTitle && (
                    <p className="mt-1 text-xs text-hgh-danger">{empForm.formState.errors.jobTitle.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-hgh-slate">Basic salary (GHS)</label>
                  <Input type="number" step="0.01" {...empForm.register("basicSalary")} />
                  {empForm.formState.errors.basicSalary && (
                    <p className="mt-1 text-xs text-hgh-danger">{empForm.formState.errors.basicSalary.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-hgh-slate">Employment type</label>
                  <Controller
                    name="employmentType"
                    control={empForm.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL_TIME">Full time</SelectItem>
                          <SelectItem value="PART_TIME">Part time</SelectItem>
                          <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-hgh-slate">Start date</label>
                  <Controller
                    name="startDate"
                    control={empForm.control}
                    render={({ field }) => (
                      <DatePickerField value={field.value} onChange={field.onChange} />
                    )}
                  />
                  {empForm.formState.errors.startDate && (
                    <p className="mt-1 text-xs text-hgh-danger">{empForm.formState.errors.startDate.message}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <HintTooltip content="Return to workspace selection.">
                  <Button type="button" variant="ghost" onClick={() => setStep("company")}>
                    Back
                  </Button>
                </HintTooltip>
                <HintTooltip content="Create this employee under the selected company and go to shift setup.">
                  <Button type="submit">Save and continue</Button>
                </HintTooltip>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "shifts" && employeeId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock size={18} className="text-hgh-gold" />
              3. Shift template & assignment
            </CardTitle>
            <p className="text-xs text-hgh-muted">
              Creates one shift and assigns <strong>{employeeName ?? "this employee"}</strong> starting today (
              {new Date().toLocaleDateString()}).
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreateShift} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-hgh-slate">Shift name</label>
                <Input {...shiftForm.register("name")} />
                {shiftForm.formState.errors.name && (
                  <p className="mt-1 text-xs text-hgh-danger">{shiftForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-hgh-slate">Start (HH:mm)</label>
                  <Controller
                    name="startTime"
                    control={shiftForm.control}
                    render={({ field }) => (
                      <TimeSelect value={field.value} onChange={field.onChange} placeholder="Start" />
                    )}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-hgh-slate">End (HH:mm)</label>
                  <Controller
                    name="endTime"
                    control={shiftForm.control}
                    render={({ field }) => (
                      <TimeSelect value={field.value} onChange={field.onChange} placeholder="End" />
                    )}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-hgh-slate">Break (min)</label>
                  <Input type="number" {...shiftForm.register("breakMinutes")} />
                </div>
              </div>
              {(shiftForm.formState.errors.startTime || shiftForm.formState.errors.endTime) && (
                <p className="text-xs text-hgh-danger">Use 24h times in HH:mm.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <HintTooltip content="Return to the employee form step.">
                  <Button type="button" variant="ghost" onClick={() => setStep("employee")}>
                    Back
                  </Button>
                </HintTooltip>
                <HintTooltip content="Creates the shift template and assigns this employee starting today.">
                  <Button type="submit">Create shift & assign</Button>
                </HintTooltip>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "done" && (
        <Card className="border-hgh-success/30 bg-hgh-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-hgh-navy">
              <CheckCircle2 className="h-5 w-5 text-hgh-success" aria-hidden />
              You&apos;re set for a minimal run
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-hgh-slate">
            <ul className="list-inside list-disc space-y-1 text-xs">
              <li>Workspace: {selected?.name}</li>
              <li>
                Employee: {employeeName} ({employeeCode})
              </li>
              <li>Shift: created and assigned from today{shiftId ? ` (${shiftId.slice(0, 8)}…)` : ""}</li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              <HintTooltip content="Back to the main dashboard and insights.">
                <Button onClick={() => router.push("/dashboard")}>Go to overview</Button>
              </HintTooltip>
              <HintTooltip content="Edit shift templates and assignments for this company.">
                <Link
                  href="/dashboard/shifts"
                  className={cn(buttonVariants({ variant: "secondary" }))}
                >
                  Manage shifts
                </Link>
              </HintTooltip>
              <HintTooltip content="Open this employee’s full record (pay, documents, check-in).">
                <Link
                  href={`/dashboard/employees/${employeeId ?? ""}`}
                  className={cn(buttonVariants({ variant: "ghost" }))}
                >
                  Employee profile
                </Link>
              </HintTooltip>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
