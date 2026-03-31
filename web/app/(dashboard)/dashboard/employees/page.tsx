"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Upload,

  MoreHorizontal,
  UserX,
  UserCheck,
  LogOut,
  Trash2,
  UserMinus,
} from "lucide-react";
import Papa from "papaparse";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CopyableCode } from "@/components/ui/copy-button";
import { GhanaBankField, GhanaBranchField } from "@/components/ui/ghana-bank-combobox";
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { useApi } from "@/lib/swr";
import { employeeDisplayName } from "@/lib/employee-display";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { SearchablePicklist } from "@/components/ui/searchable-picklist";
import { MOMO_PROVIDER_CODES, MOMO_PROVIDER_LABELS } from "@/lib/momo-providers";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Employee {
  id: string;
  employeeCode: string;
  name?: string | null;
  user?: { name: string; email: string } | null;
  department: string;
  jobTitle: string;
  basicSalary: string;
  status: "ACTIVE" | "SUSPENDED" | "TERMINATED";
  company?: { name: string };
  hasDeviceBound?: boolean;
}

const schema = z
  .object({
    name: z.string().min(1, "Employee name is required"),
    department: z.string().min(1, "Department is required"),
    jobTitle: z.string().min(1, "Job title is required"),
    basicSalary: z.coerce.number().positive("Must be greater than 0"),
    employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACTOR"]),
    startDate: z.string().min(1, "Start date is required"),
    ssnit: z.string().optional(),
    tin: z.string().optional(),
    bankName: z.string().optional(),
    bankAccount: z.string().optional(),
    bankBranch: z.string().optional(),
    momoProvider: z.string().optional(),
    momoMsisdn: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const p = (data.momoProvider ?? "").trim();
    const m = (data.momoMsisdn ?? "").replace(/\s+/g, "").trim();
    if (p && !m) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter the mobile money wallet number.",
        path: ["momoMsisdn"],
      });
    }
    if (m && !p) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select MTN, Telecel, or AirtelTigo.",
        path: ["momoProvider"],
      });
    }
  });
type FormValues = z.infer<typeof schema>;

interface FieldOptions {
  departments: string[];
  jobTitles: string[];
}

const statusBadge = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  TERMINATED: "danger",
} as const;

export default function EmployeesPage() {
  const { selected } = useCompany();
  const router = useRouter();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [terminateByCodeOpen, setTerminateByCodeOpen] = useState(false);
  const [terminateCodeInput, setTerminateCodeInput] = useState("");
  const [terminateByCodeAck, setTerminateByCodeAck] = useState(false);
  const [terminateByCodeBusy, setTerminateByCodeBusy] = useState(false);
  const [rowTerminateTarget, setRowTerminateTarget] = useState<Employee | null>(null);
  const [rowTerminateBusy, setRowTerminateBusy] = useState(false);
  /** Blocks duplicate POST / import while a request is in flight (React re-renders won’t stop double submits). */
  const createInFlightRef = useRef(false);
  const importInFlightRef = useRef(false);

  const url = selected
    ? `/api/employees?companyId=${selected.id}${search ? `&q=${encodeURIComponent(search)}` : ""}`
    : null;
  const { data: employees, mutate } = useApi<Employee[]>(url);
  const fieldOptionsUrl = selected ? `/api/employees/field-options?companyId=${selected.id}` : null;
  const { data: fieldOptions } = useApi<FieldOptions>(fieldOptionsUrl);
  const { data: me } = useApi<{ role: string }>("/api/me");
  const canManageLifecycle =
    me && ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"].includes(me.role);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employmentType: "FULL_TIME",
      startDate: "",
      bankName: "",
      bankBranch: "",
      ssnit: "",
      tin: "",
      bankAccount: "",
      momoProvider: "",
      momoMsisdn: "",
    },
  });

  const addFormBankName = useWatch({ control, name: "bankName" });

  const onSubmit = handleSubmit(async (values) => {
    if (!selected) {
      toast.error("Select a company first.");
      return;
    }
    if (createInFlightRef.current) return;
    createInFlightRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, companyId: selected.id }),
      });
      const created = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 503 && created && typeof created === "object" && created.code === "ENCRYPTION_CONFIG") {
          toast.error(
            typeof created.error === "string"
              ? created.error
              : "Server needs ENCRYPTION_KEY (64 hex chars). Set it in your host env and redeploy.",
          );
          return;
        }
        if (res.status === 409 && created && typeof created === "object") {
          const msg =
            typeof created.error === "string" ? created.error : "Duplicate create blocked.";
          toast.error(msg);
          const dupId =
            "duplicateOfId" in created && typeof created.duplicateOfId === "string"
              ? created.duplicateOfId
              : null;
          if (dupId) router.push(`/dashboard/employees/${dupId}`);
          return;
        }
        throw new Error(typeof created?.error === "string" ? created.error : "Failed to create employee");
      }
      const label =
        created && typeof created === "object" && "employeeCode" in created
          ? employeeDisplayName(created as Employee)
          : values.name;
      const newId =
        created && typeof created === "object" && "id" in created ? String((created as { id: string }).id) : null;
      toast.success(`${label} added · code ${(created as Employee)?.employeeCode ?? "assigned"}`);
      reset();
      setDialogOpen(false);
      mutate();
      if (newId) {
        router.push(`/dashboard/employees/${newId}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create employee.");
    } finally {
      createInFlightRef.current = false;
      setSubmitting(false);
    }
  });

  async function executeTerminateByCode() {
    if (!selected) return;
    const code = terminateCodeInput.trim();
    if (!code) {
      toast.error("Enter the employee payroll code.");
      return;
    }
    if (!terminateByCodeAck) {
      toast.error("Confirm that you understand this action.");
      return;
    }
    setTerminateByCodeBusy(true);
    try {
      const params = new URLSearchParams({ companyId: selected.id, code });
      const res = await fetch(`/api/employees/by-code?${params.toString()}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed");
      }
      toast.success(`${data.employeeCode ?? code} is no longer on active payroll.`);
      setTerminateCodeInput("");
      setTerminateByCodeAck(false);
      setTerminateByCodeOpen(false);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not complete this action.");
    } finally {
      setTerminateByCodeBusy(false);
    }
  }

  async function executeRowTerminate() {
    if (!selected || !rowTerminateTarget) return;
    setRowTerminateBusy(true);
    try {
      const res = await fetch(`/api/employees/${rowTerminateTarget.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed");
      toast.success(`${employeeDisplayName(rowTerminateTarget)} is no longer on active payroll.`);
      setRowTerminateTarget(null);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally {
      setRowTerminateBusy(false);
    }
  }

  async function setEmployeeStatus(empId: string, status: "ACTIVE" | "SUSPENDED") {
    setRowBusy(empId);
    try {
      const res = await fetch(`/api/employees/${empId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Update failed");
      toast.success(status === "SUSPENDED" ? "Employee suspended." : "Employee reactivated.");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status.");
    } finally {
      setRowBusy(null);
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: { data: unknown[] }) => {
        if (importInFlightRef.current) {
          toast.error("An import is already running.");
          return;
        }
        importInFlightRef.current = true;
        setSubmitting(true);
        try {
          const rows = results.data as Record<string, unknown>[];
          const res = await fetch("/api/employees/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyId: selected.id,
              employees: rows,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Import failed");
          toast.success(`Imported ${data.count} employees.`);
          setImportOpen(false);
          mutate();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Import failed");
        } finally {
          importInFlightRef.current = false;
          setSubmitting(false);
        }
      },
    });
  };

  const list = employees ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">Employees</h2>
          <p className="text-sm text-hgh-muted">
            {selected ? `Showing employees for ${selected.name}` : "Select a company to view employees."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <HintTooltip content="Upload a spreadsheet to create many employees at once. Each row gets a unique payroll code.">
            <Button variant="secondary" onClick={() => setImportOpen(true)} disabled={!selected} aria-label="Import employees from CSV">
              <Upload size={18} className="shrink-0 opacity-90" aria-hidden />
              Import CSV
            </Button>
          </HintTooltip>
          {canManageLifecycle && selected ? (
            <HintTooltip content="End one person’s active employment by typing their payroll code. Useful if duplicate rows were created or someone left. Matching is case-insensitive.">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setTerminateCodeInput("");
                  setTerminateByCodeAck(false);
                  setTerminateByCodeOpen(true);
                }}
                className="border-hgh-gold/35"
                aria-label="End employment using payroll code"
              >
                <UserMinus size={18} className="shrink-0 opacity-90" aria-hidden />
                End by code
              </Button>
            </HintTooltip>
          ) : null}
          <HintTooltip content="Create a new team member with salary and bank details. A payroll code is assigned automatically.">
            <Button onClick={() => setDialogOpen(true)} disabled={!selected} aria-label="Add a new employee">
              <Plus size={18} className="shrink-0 opacity-90" aria-hidden />
              Add Employee
            </Button>
          </HintTooltip>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-hgh-muted" />
            <Input
              placeholder="Search by name, code, department, or title..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              title="Filter the list below. Matches name, payroll code, department, or job title."
              aria-label="Search employees by name, code, department, or job title"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hgh-border text-left">
                <th className="px-5 py-3 font-medium text-hgh-muted" scope="col">
                  <HintTooltip content="Legal or preferred name on the HR record. May differ from a linked portal account name.">
                    <span className="inline cursor-default">Name</span>
                  </HintTooltip>
                </th>
                <th className="px-5 py-3 font-medium text-hgh-muted" scope="col">
                  <HintTooltip content="Unique payroll code for this company. Use it when ending employment by code or in bank files.">
                    <span className="inline cursor-default">Code</span>
                  </HintTooltip>
                </th>
                <th className="px-5 py-3 font-medium text-hgh-muted" scope="col">
                  <HintTooltip content="Department or cost centre label for reporting and suggestions on new hires.">
                    <span className="inline cursor-default">Department</span>
                  </HintTooltip>
                </th>
                <th className="px-5 py-3 font-medium text-hgh-muted" scope="col">
                  <HintTooltip content="Role title stored on the employee record.">
                    <span className="inline cursor-default">Job Title</span>
                  </HintTooltip>
                </th>
                <th className="px-5 py-3 font-medium text-hgh-muted" scope="col">
                  <HintTooltip content="Monthly basic salary in GHS before allowances. Used as the base for tax and SSNIT in payroll runs.">
                    <span className="inline cursor-default">Basic Salary</span>
                  </HintTooltip>
                </th>
                <th className="px-5 py-3 font-medium text-hgh-muted" scope="col">
                  <HintTooltip content="Kiosk device binding: required before staff can verify at the office kiosk (QR + code). Phone binds on first scan.">
                    <span className="inline cursor-default">Device</span>
                  </HintTooltip>
                </th>
                <th className="px-5 py-3 font-medium text-hgh-muted" scope="col">
                  <HintTooltip content="Active staff appear on payroll. Suspended is temporary. Terminated removes them from new pay runs.">
                    <span className="inline cursor-default">Status</span>
                  </HintTooltip>
                </th>
                {canManageLifecycle ? (
                  <th className="px-5 py-3 w-[52px] font-medium text-hgh-muted" aria-label="Actions" />
                ) : null}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManageLifecycle ? 8 : 7}
                    className="px-5 py-12 text-center text-hgh-muted"
                  >
                    <Users size={32} className="mx-auto mb-3 text-hgh-border" />
                    <p>{selected ? "No employees found." : "Select a company from the sidebar."}</p>
                  </td>
                </tr>
              ) : (
                list.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b border-hgh-border last:border-0 cursor-pointer hover:bg-hgh-offwhite/50"
                    onClick={() => router.push(`/dashboard/employees/${emp.id}`)}
                  >
                    <td className="px-5 py-3 font-medium text-hgh-navy">
                      <HintTooltip content="Open this person’s full profile — salary, documents, portal/kiosk setup, and actions.">
                        <span className="block">{employeeDisplayName(emp)}</span>
                      </HintTooltip>
                    </td>
                    <td
                      className="px-5 py-3 text-hgh-muted"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CopyableCode value={emp.employeeCode} />
                    </td>
                    <td className="px-5 py-3">{emp.department}</td>
                    <td className="px-5 py-3">{emp.jobTitle}</td>
                    <td className="px-5 py-3 tabular-nums">
                      GHS {Number(emp.basicSalary).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3">
                      {emp.hasDeviceBound ? (
                        <span className="text-xs font-medium text-hgh-success">Bound</span>
                      ) : (
                        <span className="text-xs text-hgh-muted">Not bound</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={statusBadge[emp.status]}>{emp.status}</Badge>
                    </td>
                    {canManageLifecycle ? (
                      <td className="px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              disabled={rowBusy === emp.id}
                              aria-label={`More actions for ${employeeDisplayName(emp)}`}
                              title="Row menu: profile, suspend, exit workflow, or end employment."
                            >
                              <MoreHorizontal className="h-4 w-4" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[14rem]">
                            <HintTooltip content="Open their full record — salary, components, documents, and kiosk binding." side="left">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/employees/${emp.id}`)}>
                                View profile
                              </DropdownMenuItem>
                            </HintTooltip>
                            {emp.status === "ACTIVE" ? (
                              <HintTooltip
                                content="Pause payroll and kiosk access without ending the contract. Reactivate anytime from this menu."
                                side="left"
                              >
                                <DropdownMenuItem onClick={() => void setEmployeeStatus(emp.id, "SUSPENDED")}>
                                  <UserX className="h-4 w-4 opacity-70" aria-hidden />
                                  Temporarily suspend
                                </DropdownMenuItem>
                              </HintTooltip>
                            ) : null}
                            {emp.status === "SUSPENDED" ? (
                              <HintTooltip
                                content="Return them to active payroll and allow kiosk clock-in again."
                                side="left"
                              >
                                <DropdownMenuItem onClick={() => void setEmployeeStatus(emp.id, "ACTIVE")}>
                                  <UserCheck className="h-4 w-4 opacity-70" aria-hidden />
                                  Reactivate
                                </DropdownMenuItem>
                              </HintTooltip>
                            ) : null}
                            {emp.status !== "TERMINATED" ? (
                              <>
                                <HintTooltip
                                  content="Create an exit case for offboarding steps — last day, handover, and clearance. This does not end employment by itself."
                                  side="left"
                                >
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/dashboard/exits/new?employeeId=${emp.id}`)}
                                  >
                                    <LogOut className="h-4 w-4 opacity-70" aria-hidden />
                                    Record exit process…
                                  </DropdownMenuItem>
                                </HintTooltip>
                                <HintTooltip
                                  content="Ends active employment after you confirm. They disappear from new pay runs; payslips and history stay available."
                                  side="left"
                                >
                                  <DropdownMenuItem
                                    className="text-amber-900 focus:text-amber-950 focus:bg-amber-50"
                                    onClick={() => setRowTerminateTarget(emp)}
                                  >
                                    <Trash2 className="h-4 w-4 opacity-70" aria-hidden />
                                    End employment…
                                  </DropdownMenuItem>
                                </HintTooltip>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center gap-4 text-xs text-hgh-muted">
        <span>Total: <strong className="text-hgh-slate">{list.length}</strong></span>
      </div>

      {/* Add Employee Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Add Employee"
        className="max-w-2xl"
      >
        <form onSubmit={onSubmit} className="space-y-4 pr-1">
          <p className="text-xs text-hgh-muted">
            Department and job title use searchable lists (common Ghana presets plus this company&apos;s history). SSNIT
            and TIN are never auto-filled from other staff. Bank and{" "}
            <span className="whitespace-nowrap">mobile money</span> fields are further down—scroll the modal if needed.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">
                Employee name <span className="text-hgh-danger">*</span>
              </label>
              <Input placeholder="e.g. Kwame Mensah" {...register("name")} />
              {errors.name && <p className="mt-1 text-xs text-hgh-danger">{errors.name.message}</p>}
              <p className="mt-1 text-xs text-hgh-muted">A payroll code is assigned automatically.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">
                Department <span className="text-hgh-danger">*</span>
              </label>
              <Controller
                name="department"
                control={control}
                render={({ field }) => (
                  <SearchablePicklist
                    value={field.value}
                    onChange={field.onChange}
                    options={fieldOptions?.departments ?? []}
                    placeholder="Search or pick department…"
                    aria-invalid={errors.department ? true : undefined}
                  />
                )}
              />
              {errors.department && (
                <p className="mt-1 text-xs text-hgh-danger">{errors.department.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">
                Job Title <span className="text-hgh-danger">*</span>
              </label>
              <Controller
                name="jobTitle"
                control={control}
                render={({ field }) => (
                  <SearchablePicklist
                    value={field.value}
                    onChange={field.onChange}
                    options={fieldOptions?.jobTitles ?? []}
                    placeholder="Search or pick job title…"
                    aria-invalid={errors.jobTitle ? true : undefined}
                  />
                )}
              />
              {errors.jobTitle && (
                <p className="mt-1 text-xs text-hgh-danger">{errors.jobTitle.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="employmentType">
                Employment Type
              </label>
              <Controller
                name="employmentType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="employmentType" ref={field.ref} onBlur={field.onBlur}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full Time</SelectItem>
                      <SelectItem value="PART_TIME">Part Time</SelectItem>
                      <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">
                Basic Salary (GHS) <span className="text-hgh-danger">*</span>
              </label>
              <Input type="number" step="0.01" placeholder="e.g. 5000" {...register("basicSalary")} />
              {errors.basicSalary && (
                <p className="mt-1 text-xs text-hgh-danger">{errors.basicSalary.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate" htmlFor="emp-start-date">
                Start Date <span className="text-hgh-danger">*</span>
              </label>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <DatePickerField
                    id="emp-start-date"
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
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">SSNIT (optional)</label>
              <Input placeholder="Employee SSNIT number" {...register("ssnit")} autoComplete="off" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">TIN (optional)</label>
              <Input placeholder="GRA TIN" {...register("tin")} autoComplete="off" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-1">
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">Bank name (optional)</label>
              <Controller
                name="bankName"
                control={control}
                render={({ field }) => (
                  <GhanaBankField
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Select or type bank"
                  />
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">Branch (optional)</label>
              <Controller
                name="bankBranch"
                control={control}
                render={({ field }) => (
                  <GhanaBranchField
                    bankName={(addFormBankName ?? "").trim()}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Branch"
                  />
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">Account number (optional)</label>
              <Input placeholder="Bank account" {...register("bankAccount")} autoComplete="off" />
            </div>
          </div>
          <div className="rounded-lg border border-hgh-border/80 bg-hgh-offwhite/40 px-3 py-3 space-y-3">
            <p className="text-xs font-medium text-hgh-slate">Mobile money salary (optional)</p>
            <p className="text-[11px] text-hgh-muted">
              Register MTN, Telecel Cash, or AirtelTigo wallet for staff who are paid digitally instead of (or in addition
              to) bank transfer.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-hgh-slate">Network</label>
                <Controller
                  name="momoProvider"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value?.trim() ? field.value : "__none__"}
                      onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {MOMO_PROVIDER_CODES.map((code) => (
                          <SelectItem key={code} value={code}>
                            {MOMO_PROVIDER_LABELS[code]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.momoProvider && (
                  <p className="mt-1 text-xs text-hgh-danger">{errors.momoProvider.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-hgh-slate">Wallet number</label>
                <Input
                  placeholder="e.g. 0244123456"
                  inputMode="numeric"
                  autoComplete="off"
                  {...register("momoMsisdn")}
                />
                {errors.momoMsisdn && (
                  <p className="mt-1 text-xs text-hgh-danger">{errors.momoMsisdn.message}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Add Employee"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} title="Import Employees">
        <div className="space-y-4">
          <p className="text-sm text-hgh-muted">
            Upload a CSV with columns:{" "}
            <strong>name</strong> (or <strong>employeeName</strong>),{" "}
            <strong>department, jobTitle, basicSalary, employmentType, startDate</strong>. Each row gets a unique
            employee code automatically. Optional <strong>employeeCode</strong> in the file is ignored.
          </p>
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-hgh-border bg-hgh-offwhite/50 py-10">
            <Upload size={32} className="mb-4 text-hgh-muted" />
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="hidden"
              id="csv-upload"
              disabled={submitting}
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer text-sm font-medium text-hgh-navy hover:underline"
            >
              {submitting ? "Importing..." : "Click to select a CSV file"}
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={terminateByCodeOpen}
        onClose={() => {
          if (!terminateByCodeBusy) setTerminateByCodeOpen(false);
        }}
        title="End employment by payroll code"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-hgh-slate">
            Enter the <strong className="text-hgh-navy">exact payroll code</strong> for the active record to move to
            terminated. Matching is case-insensitive in this workspace only. They will not appear on new pay runs;
            historical payslips remain available.
          </p>
          <div>
            <label htmlFor="terminate-code-input" className="mb-1 block text-sm font-medium text-hgh-slate">
              Payroll code
            </label>
            <Input
              id="terminate-code-input"
              placeholder="e.g. ACME-A1B2C3-0001"
              value={terminateCodeInput}
              onChange={(e) => setTerminateCodeInput(e.target.value)}
              autoComplete="off"
              disabled={terminateByCodeBusy}
              title="Copy the code from the employee list or profile header."
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-xs text-hgh-slate">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-hgh-border text-hgh-navy focus:ring-hgh-gold"
              checked={terminateByCodeAck}
              onChange={(e) => setTerminateByCodeAck(e.target.checked)}
              disabled={terminateByCodeBusy}
            />
            <span>I understand this ends their active employment for this company.</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setTerminateByCodeOpen(false)}
              disabled={terminateByCodeBusy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!terminateCodeInput.trim() || !terminateByCodeAck || terminateByCodeBusy}
              className="border border-amber-800/25 bg-white text-amber-950 hover:bg-amber-50"
              onClick={() => void executeTerminateByCode()}
            >
              {terminateByCodeBusy ? "Working…" : "End employment"}
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={rowTerminateTarget !== null}
        onClose={() => {
          if (!rowTerminateBusy) setRowTerminateTarget(null);
        }}
        title="End employment"
        description={
          rowTerminateTarget ? (
            <>
              You are about to end active employment for{" "}
              <strong className="text-hgh-navy">{employeeDisplayName(rowTerminateTarget)}</strong> (
              <span className="tabular-nums font-medium">{rowTerminateTarget.employeeCode}</span>). They will be
              marked terminated and excluded from new payroll runs. You can still use{" "}
              <strong className="text-hgh-navy">Exits</strong> for clearance paperwork if needed.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="End employment"
        acknowledgeText="I confirm I want to end this person’s active employment for this company."
        onConfirm={executeRowTerminate}
        busy={rowTerminateBusy}
      />
    </div>
  );
}
