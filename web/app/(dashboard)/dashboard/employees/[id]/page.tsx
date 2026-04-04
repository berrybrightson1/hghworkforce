"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Smartphone,
  Plus,
  Trash2,
  User,
  Wallet,
  MoreHorizontal,
  UserX,
  UserCheck,
  LogOut,
  KeyRound,
} from "lucide-react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerField } from "@/components/ui/date-picker";
import { useToast } from "@/components/toast/useToast";
import { useApi } from "@/lib/swr";
import { employeeDisplayName } from "@/lib/employee-display";

import Link from "next/link";
import { CopyableCode } from "@/components/ui/copy-button";
import { GhanaBankField, GhanaBranchField } from "@/components/ui/ghana-bank-combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isRedactedLikeInput } from "@/lib/redacted-sensitive";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { SearchablePicklist } from "@/components/ui/searchable-picklist";
import { MOMO_PROVIDER_CODES, MOMO_PROVIDER_LABELS, isMomoProviderCode } from "@/lib/momo-providers";
import { DismissibleCallout } from "@/components/ui/dismissible-callout";

type DetailConfirm =
  | { type: "endEmployment" }
  | { type: "deleteComponent"; id: string }
  | { type: "deleteDocument"; id: string }
  | { type: "deleteTask"; id: string; title: string };

interface FieldOptions {
  departments: string[];
  jobTitles: string[];
}

interface SalaryComponent {
  id: string;
  type: "ALLOWANCE" | "DEDUCTION";
  name: string;
  amount: string;
  isRecurring: boolean;
  startDate: string;
  endDate: string | null;
  note: string | null;
}

interface EmployeeDocument {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
}

const LINE_MANAGER_NONE = "__line_manager_none__";

interface CompanyUserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
}

interface Employee {
  id: string;
  userId: string | null;
  employeeCode: string;
  name?: string | null;
  user?: { email: string; name: string } | null;
  managedByUserId?: string | null;
  managedBy?: { id: string; email: string; name: string | null } | null;
  department: string;
  jobTitle: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACTOR";
  startDate: string;
  status: "ACTIVE" | "SUSPENDED" | "TERMINATED";
  basicSalary: string;
  company: { id: string; name: string };
  salaryComponents: SalaryComponent[];
  hasDeviceBound?: boolean;
  deviceBoundAt?: string | null;
  portalEnabled?: boolean;
  portalLastLoginAt?: string | null;
  pinChangedAt?: string | null;
  portalHasPermanentPin?: boolean;
  portalAwaitingPinChange?: boolean;
  // Sensitive fields (masked by default)
  ssnit?: string;
  tin?: string;
  bankName?: string;
  bankAccount?: string;
  bankBranch?: string;
  momoProvider?: string | null;
  momoMsisdn?: string | null;
}

const componentSchema = z.object({
  type: z.enum(["ALLOWANCE", "DEDUCTION"]),
  name: z.string().min(1, "Name is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  isRecurring: z.boolean(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  note: z.string().optional(),
});
type ComponentFormValues = z.infer<typeof componentSchema>;

const docSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  file: z.any().refine((files) => files?.length > 0, "File is required"),
});
type DocFormValues = z.infer<typeof docSchema>;

const profileSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    department: z.string().min(1, "Department is required"),
    jobTitle: z.string().min(1, "Job title is required"),
    employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACTOR"]),
    basicSalary: z.coerce.number().positive("Must be positive"),
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
        message: "Enter mobile money wallet number.",
        path: ["momoMsisdn"],
      });
    }
    if (m && !p) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select mobile money network.",
        path: ["momoProvider"],
      });
    }
  });
type ProfileFormValues = z.infer<typeof profileSchema>;

interface EmpLeaveRequestRow {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
}

interface EmpLeaveBalanceRow {
  type: string;
  entitled: number;
  used: number;
  remaining: number;
}

interface EmpLeaveBalancePayload {
  employeeId: string;
  balances: EmpLeaveBalanceRow[];
}

interface EmpLoanRow {
  id: string;
  type: string;
  amount: string;
  balance: string;
  monthlyRepayment: string;
  status: string;
  disbursedAt: string;
}

const leaveStatusBadge = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "default",
} as const;

const loanStatusBadge = {
  ACTIVE: "success",
  COMPLETED: "default",
  CANCELLED: "danger",
} as const;

function EmployeeDetailPageContent() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "profile" | "components" | "docs" | "onboarding" | "leave" | "loans"
  >("profile");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [compDialogOpen, setCompDialogOpen] = useState(false);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [submittingComp, setSubmittingComp] = useState(false);
  const [submittingDoc, setSubmittingDoc] = useState(false);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [portalTempPin, setPortalTempPin] = useState("");
  const [portalBusy, setPortalBusy] = useState(false);
  const [managerBusy, setManagerBusy] = useState(false);

  const { data: employee, mutate, isLoading, error } = useApi<Employee>(
    `/api/employees/${id}${revealed ? "?decrypt=true" : ""}`
  );
  const { data: me } = useApi<{ id: string; role: string }>("/api/me");
  const fieldOptionsUrl = employee?.company?.id
    ? `/api/employees/field-options?companyId=${employee.company.id}`
    : null;
  const { data: fieldOptions } = useApi<FieldOptions>(fieldOptionsUrl);
  const [headerMenuBusy, setHeaderMenuBusy] = useState(false);
  const [detailConfirm, setDetailConfirm] = useState<DetailConfirm | null>(null);
  const [detailConfirmBusy, setDetailConfirmBusy] = useState(false);
  const { data: documents, mutate: mutateDocs } = useApi<EmployeeDocument[]>(`/api/employees/${id}/documents`);

  const leaveForEmpUrl =
    employee?.company?.id && activeTab === "leave"
      ? `/api/leave?companyId=${employee.company.id}&employeeId=${id}`
      : null;
  const { data: empLeaveList } = useApi<EmpLeaveRequestRow[]>(leaveForEmpUrl);

  const leaveBalForEmpUrl =
    employee?.company?.id && activeTab === "leave"
      ? `/api/leave/balances?companyId=${employee.company.id}&employeeId=${id}`
      : null;
  const { data: empLeaveBalances } = useApi<EmpLeaveBalancePayload | null>(leaveBalForEmpUrl);

  const loansForEmpUrl =
    employee?.company?.id && activeTab === "loans"
      ? `/api/loans?companyId=${employee.company.id}&employeeId=${id}`
      : null;
  const { data: empLoans } = useApi<EmpLoanRow[]>(loansForEmpUrl);

  const isPayrollAdmin =
    me?.role === "SUPER_ADMIN" || me?.role === "COMPANY_ADMIN" || me?.role === "HR";

  const companyUsersUrl =
    employee?.company?.id && isPayrollAdmin
      ? `/api/users?companyId=${employee.company.id}`
      : null;
  const { data: companyUsers } = useApi<CompanyUserRow[]>(companyUsersUrl);
  const { data: onboardingTasks, mutate: mutateTasks } = useApi<
    { id: string; title: string; completed: boolean; sortOrder: number }[]
  >(
    isPayrollAdmin && activeTab === "onboarding"
      ? `/api/employees/${id}/onboarding-tasks`
      : null,
  );

  function openEditProfile() {
    if (!employee) return;
    const isSelf = Boolean(employee.userId && me?.id === employee.userId);
    if (!isSelf) setRevealed(true);
    setEditDialogOpen(true);
  }

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: { type: "ALLOWANCE", isRecurring: true, startDate: new Date().toISOString().split("T")[0] },
  });

  const {
    register: regDoc,
    handleSubmit: handleDocSubmit,
    reset: resetDoc,
    formState: { errors: docErrors },
  } = useForm<DocFormValues>({
    resolver: zodResolver(docSchema),
  });

  const {
    register: regProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    control: controlProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  const bankNameWatch = useWatch({ control: controlProfile, name: "bankName" });

  useEffect(() => {
    if (!isPayrollAdmin && activeTab === "onboarding") setActiveTab("profile");
  }, [isPayrollAdmin, activeTab]);

  // Sync profile form when employee data loads
  useEffect(() => {
    if (employee) {
      const isSelfProfile = Boolean(employee.userId && me?.id === employee.userId);
      resetProfile({
        name: employee.name?.trim() || employee.user?.name || "",
        department: employee.department,
        jobTitle: employee.jobTitle,
        employmentType: employee.employmentType,
        basicSalary: Number(employee.basicSalary),
        startDate: employee.startDate.includes("T")
          ? employee.startDate.slice(0, 10)
          : employee.startDate,
        ssnit: revealed ? employee.ssnit : "",
        tin: revealed ? employee.tin : "",
        bankName: revealed ? employee.bankName : "",
        bankAccount: revealed ? employee.bankAccount : "",
        bankBranch: revealed ? employee.bankBranch : "",
        momoProvider: !isSelfProfile ? (employee.momoProvider ?? "") : "",
        momoMsisdn: !isSelfProfile && revealed ? (employee.momoMsisdn ?? "") : "",
      });
    }
  }, [employee, resetProfile, revealed, me?.id]);

  const onUpdateProfile = handleProfileSubmit(async (values) => {
    setSubmittingProfile(true);
    try {
      const isSelf = Boolean(employee?.userId && me?.id === employee.userId);
      const payload: Record<string, unknown> = { ...values };
      if (isSelf) {
        delete payload.ssnit;
        delete payload.tin;
        delete payload.bankName;
        delete payload.bankAccount;
        delete payload.bankBranch;
        delete payload.momoProvider;
        delete payload.momoMsisdn;
      } else {
        for (const key of ["ssnit", "tin", "bankName", "bankAccount", "bankBranch", "momoMsisdn"] as const) {
          const v = payload[key];
          if (isRedactedLikeInput(v)) delete payload[key];
        }
      }
      if (isSelf) delete payload.startDate;
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const patchJson = await res.json().catch(() => null);
      if (!res.ok) {
        if (
          res.status === 503 &&
          patchJson &&
          typeof patchJson === "object" &&
          patchJson.code === "ENCRYPTION_CONFIG"
        ) {
          toast.error(
            typeof patchJson.error === "string"
              ? patchJson.error
              : "Server needs ENCRYPTION_KEY (64 hex chars). Set it in Vercel and redeploy.",
          );
          return;
        }
        throw new Error(
          typeof patchJson?.error === "string" ? patchJson.error : "Failed to update profile.",
        );
      }
      toast.success("Profile updated.");
      setEditDialogOpen(false);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update profile.");
    } finally {
      setSubmittingProfile(false);
    }
  });

  const onAddComp = handleSubmit(async (values) => {
    setSubmittingComp(true);
    try {
      const res = await fetch(`/api/employees/${id}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error();
      toast.success("Salary component added.");
      reset();
      setCompDialogOpen(false);
      mutate();
    } catch {
      toast.error("Failed to add component.");
    } finally {
      setSubmittingComp(false);
    }
  });

  const onUploadDoc = handleDocSubmit(async (values) => {
    setSubmittingDoc(true);
    try {
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("file", values.file[0]);

      const res = await fetch(`/api/employees/${id}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      toast.success("Document uploaded.");
      resetDoc();
      setDocDialogOpen(false);
      mutateDocs();
    } catch {
      toast.error("Failed to upload document.");
    } finally {
      setSubmittingDoc(false);
    }
  });

  function deleteComp(compId: string) {
    setDetailConfirm({ type: "deleteComponent", id: compId });
  }

  function deleteDoc(docId: string) {
    setDetailConfirm({ type: "deleteDocument", id: docId });
  }

  async function handleDetailConfirm() {
    if (!detailConfirm) return;
    setDetailConfirmBusy(true);
    try {
      if (detailConfirm.type === "endEmployment") {
        const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed");
        toast.success("Employment ended.");
        setDetailConfirm(null);
        mutate();
        router.push("/dashboard/employees");
        return;
      }
      if (detailConfirm.type === "deleteComponent") {
        const res = await fetch(`/api/employees/${id}/components/${detailConfirm.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        toast.success("Component removed.");
        setDetailConfirm(null);
        mutate();
        return;
      }
      if (detailConfirm.type === "deleteDocument") {
        const res = await fetch(`/api/employees/${id}/documents/${detailConfirm.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        toast.success("Document deleted.");
        setDetailConfirm(null);
        mutateDocs();
        return;
      }
      if (detailConfirm.type === "deleteTask") {
        const res = await fetch(`/api/employees/${id}/onboarding-tasks/${detailConfirm.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error();
        toast.success("Task removed.");
        setDetailConfirm(null);
        mutateTasks();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setDetailConfirmBusy(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-xl border border-hgh-border bg-white p-8 text-center text-sm text-hgh-danger">
        Employee not found or access denied.
        <div className="mt-4">
          <Button variant="secondary" onClick={() => router.push("/dashboard/employees")}>
            Back to employees
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !employee) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-hgh-border" />
      <div className="h-64 rounded-xl bg-hgh-border" />
    </div>;
  }

  const isSelfProfile = Boolean(employee.userId && me?.id === employee.userId);
  const showDeviceBindingCard =
    employee.status === "ACTIVE" && (isPayrollAdmin || isSelfProfile);

  async function setEmployeeStatus(status: "ACTIVE" | "SUSPENDED") {
    setHeaderMenuBusy(true);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Update failed");
      toast.success(status === "SUSPENDED" ? "Employee suspended." : "Employee reactivated.");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally {
      setHeaderMenuBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/employees")}>
            <ArrowLeft size={18} />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-hgh-navy">{employeeDisplayName(employee)}</h2>
            <p className="text-sm text-hgh-muted">
              {employee.employeeCode} &middot; {employee.jobTitle} &middot; {employee.department}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              employee.status === "ACTIVE" ? "success" : employee.status === "TERMINATED" ? "danger" : "warning"
            }
          >
            {employee.status}
          </Badge>
          {isPayrollAdmin ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 w-8 border border-hgh-border p-0"
                  disabled={headerMenuBusy}
                  aria-label="Employee actions menu"

                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[14rem]">
                {employee.status === "ACTIVE" ? (
                  <HintTooltip
                    content="Pause payroll and kiosk access without ending the contract. Reactivate anytime from this menu."
                    side="left"
                  >
                    <DropdownMenuItem onClick={() => void setEmployeeStatus("SUSPENDED")}>
                      <UserX className="h-4 w-4 opacity-70" aria-hidden />
                      Temporarily suspend
                    </DropdownMenuItem>
                  </HintTooltip>
                ) : null}
                {employee.status === "SUSPENDED" ? (
                  <HintTooltip content="Return them to active payroll and allow kiosk clock-in again." side="left">
                    <DropdownMenuItem onClick={() => void setEmployeeStatus("ACTIVE")}>
                      <UserCheck className="h-4 w-4 opacity-70" aria-hidden />
                      Reactivate
                    </DropdownMenuItem>
                  </HintTooltip>
                ) : null}
                {employee.status !== "TERMINATED" ? (
                  <>
                    <HintTooltip
                      content="Create an exit case for offboarding steps — last day, handover, and clearance. This does not end employment by itself."
                      side="left"
                    >
                      <DropdownMenuItem
                        onClick={() => router.push(`/dashboard/exits/new?employeeId=${employee.id}`)}
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
                        className="text-amber-900 focus:bg-amber-50 focus:text-amber-950"
                        onClick={() => setDetailConfirm({ type: "endEmployment" })}
                      >
                        <Trash2 className="h-4 w-4 opacity-70" aria-hidden />
                        End employment…
                      </DropdownMenuItem>
                    </HintTooltip>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap border-b border-hgh-border">
        {(
          [
            "profile",
            "components",
            "docs",
            ...(isPayrollAdmin ? (["onboarding"] as const) : []),
            "leave",
            "loans",
          ] as const
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "border-b-2 border-hgh-navy text-hgh-navy"
                : "text-hgh-muted hover:text-hgh-navy"
            }`}
          >
            {tab === "onboarding" ? "Onboarding" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <User size={18} />
                Employment Details
              </CardTitle>
              <div className="flex gap-2">
                <HintTooltip
                  content={
                    isPayrollAdmin
                      ? "Show or hide tax, SSNIT, TIN, and bank fields for editing. Only admins can change those values."
                      : "Reveal encrypted tax and bank fields for your own record when your admin allows it."
                  }
                >
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setRevealed(!revealed)}
                    aria-label={revealed ? "Hide sensitive fields" : "Reveal sensitive fields"}
                  >
                    {revealed ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                    {revealed ? "Hide" : "Reveal"}
                  </Button>
                </HintTooltip>
                <HintTooltip content="Update name, department, salary, and related details. Tax and bank changes require admin access unless it is your own employee-linked account with limits.">
                  <Button size="sm" onClick={openEditProfile} aria-label="Edit employee profile">
                    Edit Profile
                  </Button>
                </HintTooltip>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-hgh-muted">Name</p>
                  <p className="font-medium text-hgh-navy">{employeeDisplayName(employee)}</p>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <p className="text-xs text-hgh-muted">Employee Code</p>
                  <CopyableCode value={employee.employeeCode} className="mt-1" />
                </div>
                <div>
                  <p className="text-xs text-hgh-muted">Employment Type</p>
                  <p className="font-medium text-hgh-navy">{employee.employmentType}</p>
                </div>
                <div>
                  <p className="text-xs text-hgh-muted">Department</p>
                  <p className="font-medium text-hgh-navy">{employee.department}</p>
                </div>
                <div>
                  <p className="text-xs text-hgh-muted">Job Title</p>
                  <p className="font-medium text-hgh-navy">{employee.jobTitle}</p>
                </div>
                <div>
                  <p className="text-xs text-hgh-muted">SSNIT Number</p>
                  <p className="font-medium text-hgh-navy">{employee.ssnit || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-hgh-muted">TIN</p>
                  <p className="font-medium text-hgh-navy">{employee.tin || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-hgh-muted">Start Date</p>
                  <p className="font-medium text-hgh-navy">{new Date(employee.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-hgh-muted">Company</p>
                  <p className="font-medium text-hgh-navy">{employee.company.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet size={18} />
                  Salary Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-hgh-muted">Basic Salary</p>
                  <p className="text-2xl font-bold text-hgh-navy">
                    GHS {Number(employee.basicSalary).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard size={18} />
                  Bank Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-hgh-muted">Bank Name</p>
                    <p className="font-medium text-hgh-navy">{employee.bankName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-hgh-muted">Branch</p>
                    <p className="font-medium text-hgh-navy">{employee.bankBranch || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-hgh-muted">Account Number</p>
                    <p className="font-medium text-hgh-navy">{employee.bankAccount || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone size={18} />
                  Mobile money
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-hgh-muted">Network</p>
                    <p className="font-medium text-hgh-navy">
                      {employee.momoProvider && isMomoProviderCode(employee.momoProvider)
                        ? MOMO_PROVIDER_LABELS[employee.momoProvider]
                        : employee.momoProvider || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-hgh-muted">Wallet number</p>
                    <p className="font-medium text-hgh-navy">{employee.momoMsisdn || "—"}</p>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-hgh-muted">
                  For payroll records only—this app does not send mobile money or bank transfers.
                </p>
              </CardContent>
            </Card>

            {isPayrollAdmin && employee.status === "ACTIVE" && (
              <Card className="scroll-mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User size={18} />
                    Line manager
                  </CardTitle>
                  <p className="text-xs text-hgh-muted">
                    When set, pending leave, loans, and attendance corrections for this employee appear
                    in that user&apos;s inbox under &quot;My team&quot; (in addition to company-wide
                    views).
                  </p>
                </CardHeader>
                <CardContent>
                  <label className="mb-1 block text-xs font-medium text-hgh-slate" htmlFor="emp-line-manager">
                    Reports to (dashboard user)
                  </label>
                  <Select
                    value={employee.managedByUserId ?? LINE_MANAGER_NONE}
                    disabled={managerBusy}
                    onValueChange={async (v) => {
                      const next = v === LINE_MANAGER_NONE ? null : v;
                      setManagerBusy(true);
                      try {
                        const res = await fetch(`/api/employees/${id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ managedByUserId: next }),
                        });
                        const d = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          throw new Error(typeof d.error === "string" ? d.error : "Update failed");
                        }
                        await mutate();
                        toast.success(
                          next ? "Line manager updated." : "Line manager cleared.",
                        );
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Could not update line manager.");
                      } finally {
                        setManagerBusy(false);
                      }
                    }}
                  >
                    <SelectTrigger id="emp-line-manager" className="w-full max-w-md">
                      <SelectValue placeholder="No manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LINE_MANAGER_NONE}>No manager</SelectItem>
                      {(companyUsers ?? [])
                        .filter((u) => u.isActive)
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {(u.name || u.email).trim()} ({u.role})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {employee.managedBy ? (
                    <p className="mt-2 text-xs text-hgh-muted">
                      Current: {employee.managedBy.name?.trim() || employee.managedBy.email}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {isPayrollAdmin && employee.status === "ACTIVE" && (
              <Card className="scroll-mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound size={18} />
                    Portal access
                  </CardTitle>
                  <p className="text-xs text-hgh-muted">
                    Employees sign in at{" "}
                    <Link href="/portal/login" className="text-hgh-gold underline underline-offset-2">
                      /portal/login
                    </Link>{" "}
                    with employee code and PIN (no work email required). First-time users without a PIN can create
                    one at{" "}
                    <Link href="/portal/first-pin" className="text-hgh-gold underline underline-offset-2">
                      /portal/first-pin
                    </Link>
                    . Share temporary PINs securely when you want HR to set the first login code.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-hgh-navy">Allow portal sign-in</p>
                      <p className="text-xs text-hgh-muted">
                        Last portal sign-in:{" "}
                        {employee.portalLastLoginAt
                          ? new Date(employee.portalLastLoginAt).toLocaleString("en-GH")
                          : "Never"}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={employee.portalEnabled !== false}
                      aria-label={employee.portalEnabled === false ? "Enable portal access" : "Disable portal access"}

                      disabled={portalBusy}
                      onClick={async () => {
                        const next = employee.portalEnabled === false;
                        setPortalBusy(true);
                        try {
                          const res = await fetch(`/api/employees/${id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ portalEnabled: next }),
                          });
                          if (!res.ok) {
                            const d = await res.json().catch(() => ({}));
                            throw new Error(typeof d.error === "string" ? d.error : "Update failed");
                          }
                          await mutate();
                          toast.success(
                            next
                              ? "Portal access enabled."
                              : "Portal access disabled. Existing sessions expire when their cookie ends.",
                          );
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Could not update portal access.");
                        } finally {
                          setPortalBusy(false);
                        }
                      }}
                      className={cn(
                        "relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold focus-visible:ring-offset-2 disabled:opacity-50",
                        employee.portalEnabled !== false ? "bg-hgh-success" : "bg-hgh-border",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform",
                          employee.portalEnabled !== false ? "left-7" : "left-1",
                        )}
                      />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {employee.portalHasPermanentPin ? (
                      <Badge variant="success">PIN configured</Badge>
                    ) : (
                      <Badge variant="default">No permanent PIN yet</Badge>
                    )}
                    {employee.portalAwaitingPinChange ? (
                      <Badge variant="warning">Must set own PIN on next login</Badge>
                    ) : null}
                  </div>
                  {employee.portalEnabled !== false && (
                    <div className="space-y-2 rounded-lg border border-hgh-border bg-hgh-offwhite/50 p-3">
                      <p className="text-xs font-medium text-hgh-navy">Temporary PIN</p>
                      <p className="text-[11px] text-hgh-muted">
                        Sets a 4-digit code; employee chooses a permanent PIN after signing in.
                      </p>
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[7rem] flex-1">
                          <label htmlFor="portal-temp-pin" className="sr-only">
                            Temporary PIN
                          </label>
                          <Input
                            id="portal-temp-pin"
                            inputMode="numeric"
                            maxLength={4}
                            autoComplete="off"
                            placeholder="4 digits"
                            value={portalTempPin}
                            onChange={(e) => setPortalTempPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            disabled={portalBusy}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={portalBusy}
                          onClick={() => setPortalTempPin(String(Math.floor(1000 + Math.random() * 9000)))}
                        >
                          Generate
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-hgh-navy text-white hover:bg-hgh-navy/90"
                          disabled={portalBusy || !/^\d{4}$/.test(portalTempPin)}
                          onClick={async () => {
                            setPortalBusy(true);
                            try {
                              const res = await fetch(`/api/employees/${id}/set-temp-pin`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ pin: portalTempPin }),
                              });
                              if (!res.ok) {
                                const d = await res.json().catch(() => ({}));
                                throw new Error(typeof d.error === "string" ? d.error : "Request failed");
                              }
                              const name = employeeDisplayName({
                                name: employee.name,
                                user: employee.user,
                                employeeCode: employee.employeeCode,
                              });
                              toast.success(`Temporary PIN set. Share it with ${name} securely.`);
                              setPortalTempPin("");
                              await mutate();
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Could not set PIN.");
                            } finally {
                              setPortalBusy(false);
                            }
                          }}
                        >
                          Set temporary PIN
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {showDeviceBindingCard && (
              <Card className="scroll-mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone size={18} />
                    Device binding
                  </CardTitle>
                  <p className="text-xs text-hgh-muted">
                    A bound device is used for kiosk check-in. Resetting lets the employee bind a new device.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {employee.hasDeviceBound ? (
                    <p className="text-sm text-hgh-success">
                      Device bound
                      {employee.deviceBoundAt ? (
                        <span className="text-hgh-muted">
                          {" "}
                          · since {new Date(employee.deviceBoundAt).toLocaleString()}
                        </span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="text-sm text-hgh-muted">No device bound</p>
                  )}
                  {isPayrollAdmin && employee.hasDeviceBound && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/employees/${employee.id}/reset-device`, { method: "POST" });
                          if (!res.ok) {
                            const data = await res.json().catch(() => ({}));
                            throw new Error(typeof data.error === "string" ? data.error : "Reset failed");
                          }
                          toast.success("Device binding reset.");
                          mutate();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed to reset device.");
                        }
                      }}
                    >
                      Reset device
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === "components" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Plus size={18} />
              Recurring Components
            </CardTitle>
            <HintTooltip content="Add a recurring allowance or deduction applied on future payroll runs.">
              <Button size="sm" onClick={() => setCompDialogOpen(true)}>
                <Plus size={16} />
                Add Component
              </Button>
            </HintTooltip>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hgh-border text-left">
                  <th className="px-5 py-3 font-medium text-hgh-muted">Name</th>
                  <th className="px-5 py-3 font-medium text-hgh-muted">Type</th>
                  <th className="px-5 py-3 font-medium text-hgh-muted">Amount</th>
                  <th className="px-5 py-3 font-medium text-hgh-muted">Starts</th>
                  <th className="px-5 py-3 font-medium text-hgh-muted">Ends</th>
                  <th className="px-5 py-3 font-medium text-hgh-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employee.salaryComponents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-hgh-muted">
                      No additional allowances or deductions configured.
                    </td>
                  </tr>
                ) : (
                  employee.salaryComponents.map((c) => (
                    <tr key={c.id} className="border-b border-hgh-border last:border-0">
                      <td className="px-5 py-3 font-medium text-hgh-navy">{c.name}</td>
                      <td className="px-5 py-3">
                        <Badge variant={c.type === "ALLOWANCE" ? "success" : "danger"}>
                          {c.type}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 tabular-nums font-medium">
                        {c.type === "DEDUCTION" ? "-" : "+"}
                        {Number(c.amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3">{new Date(c.startDate).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-hgh-muted">
                        {c.endDate ? new Date(c.endDate).toLocaleDateString() : "Ongoing"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <HintTooltip content="Remove this allowance or deduction. It will no longer apply to new payroll calculations.">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-800 hover:bg-amber-50 hover:text-amber-950"
                            onClick={() => deleteComp(c.id)}
                            aria-label={`Remove component ${c.name}`}
                          >
                            <Trash2 size={16} aria-hidden />
                          </Button>
                        </HintTooltip>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "docs" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <FileText size={18} />
              Employee Documents
            </CardTitle>
            <HintTooltip content="Attach a contract, ID, or other file to this employee record.">
              <Button size="sm" onClick={() => setDocDialogOpen(true)}>
                <Plus size={16} />
                Upload Document
              </Button>
            </HintTooltip>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hgh-border text-left">
                  <th className="px-5 py-3 font-medium text-hgh-muted">Name</th>
                  <th className="px-5 py-3 font-medium text-hgh-muted">Uploaded At</th>
                  <th className="px-5 py-3 font-medium text-hgh-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!documents || documents.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-10 text-center text-hgh-muted">
                      No documents uploaded yet.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="border-b border-hgh-border last:border-0">
                      <td className="px-5 py-3 font-medium text-hgh-navy">{doc.name}</td>
                      <td className="px-5 py-3 text-hgh-muted">{new Date(doc.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-hgh-navy")}
                          >
                            View
                          </a>
                          <HintTooltip content="Permanently remove this file from the employee record (stored file may remain in storage per provider policy).">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-amber-800 hover:bg-amber-50 hover:text-amber-950"
                              onClick={() => deleteDoc(doc.id)}
                              aria-label={`Delete document ${doc.name}`}
                            >
                              <Trash2 size={16} aria-hidden />
                            </Button>
                          </HintTooltip>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "onboarding" && isPayrollAdmin && (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <CardTitle>Onboarding checklist</CardTitle>
            <div className="flex w-full max-w-md gap-2 sm:w-auto">
              <Input
                placeholder="New task title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
              <Button
                type="button"
                onClick={async () => {
                  const title = newTaskTitle.trim();
                  if (!title) return;
                  const res = await fetch(`/api/employees/${id}/onboarding-tasks`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title }),
                  });
                  if (!res.ok) {
                    toast.error("Could not add task");
                    return;
                  }
                  setNewTaskTitle("");
                  mutateTasks();
                  toast.success("Task added.");
                }}
              >
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {!onboardingTasks?.length ? (
              <p className="text-sm text-hgh-muted">No tasks yet.</p>
            ) : (
              onboardingTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hgh-border px-3 py-2"
                >
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      className="rounded border-hgh-border"
                      onChange={async (e) => {
                        const res = await fetch(`/api/employees/${id}/onboarding-tasks/${t.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ completed: e.target.checked }),
                        });
                        if (res.ok) mutateTasks();
                      }}
                    />
                    <span className={t.completed ? "text-hgh-muted line-through" : "text-hgh-navy"}>
                      {t.title}
                    </span>
                  </label>
                  <HintTooltip content="Remove this checklist item from onboarding. This does not delete the employee.">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-amber-800 hover:bg-amber-50 hover:text-amber-950"
                      onClick={() => setDetailConfirm({ type: "deleteTask", id: t.id, title: t.title })}
                      aria-label={`Remove task ${t.title}`}
                    >
                      <Trash2 size={16} aria-hidden />
                    </Button>
                  </HintTooltip>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "leave" && employee && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-hgh-muted">
              Leave requests and balances for this employee. Manage approvals and policies from{" "}
              <Link href="/dashboard/leave" className="font-medium text-hgh-navy underline decoration-hgh-gold/40 hover:decoration-hgh-gold">
                Leave
              </Link>
              .
            </p>
          </div>
          {empLeaveBalances === undefined ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-hgh-muted">Loading balances…</CardContent>
            </Card>
          ) : empLeaveBalances === null || empLeaveBalances.balances.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-hgh-muted">
                No leave entitlements configured for this company, or none apply yet. Set them under Leave →
                Entitlements.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Balances (approved usage)</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hgh-border text-left">
                      <th className="py-2 pr-4 font-medium text-hgh-muted">Type</th>
                      <th className="py-2 pr-4 font-medium text-hgh-muted">Entitled</th>
                      <th className="py-2 pr-4 font-medium text-hgh-muted">Used</th>
                      <th className="py-2 font-medium text-hgh-muted">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empLeaveBalances.balances.map((b) => (
                      <tr key={b.type} className="border-b border-hgh-border/80 last:border-0">
                        <td className="py-2 pr-4 font-medium text-hgh-navy">{b.type}</td>
                        <td className="py-2 pr-4 tabular-nums">{b.entitled}</td>
                        <td className="py-2 pr-4 tabular-nums">{b.used}</td>
                        <td className="py-2 tabular-nums font-medium text-hgh-navy">{b.remaining}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requests ({empLeaveList?.length ?? 0})</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hgh-border text-left">
                    <th className="px-5 py-3 font-medium text-hgh-muted">Type</th>
                    <th className="px-5 py-3 font-medium text-hgh-muted">Dates</th>
                    <th className="px-5 py-3 font-medium text-hgh-muted">Days</th>
                    <th className="px-5 py-3 font-medium text-hgh-muted">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {empLeaveList === undefined ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-hgh-muted">
                        Loading requests…
                      </td>
                    </tr>
                  ) : empLeaveList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-hgh-muted">
                        No leave requests yet for this employee.
                      </td>
                    </tr>
                  ) : (
                    empLeaveList.map((r) => (
                      <tr key={r.id} className="border-b border-hgh-border last:border-0">
                        <td className="px-5 py-3 font-medium text-hgh-navy">{r.type}</td>
                        <td className="px-5 py-3 text-hgh-muted">
                          {new Date(r.startDate).toLocaleDateString()} –{" "}
                          {new Date(r.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 tabular-nums">{r.days}</td>
                        <td className="px-5 py-3">
                          <Badge variant={leaveStatusBadge[r.status] ?? "default"}>{r.status}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "loans" && employee && (
        <div className="space-y-6">
          <p className="text-sm text-hgh-muted">
            Loans and advances for this employee. Create or review all company loans from{" "}
            <Link href="/dashboard/loans" className="font-medium text-hgh-navy underline decoration-hgh-gold/40 hover:decoration-hgh-gold">
              Loans
            </Link>
            .
          </p>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Loans ({empLoans?.length ?? 0})</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hgh-border text-left">
                    <th className="px-5 py-3 font-medium text-hgh-muted">Type</th>
                    <th className="px-5 py-3 font-medium text-hgh-muted">Amount</th>
                    <th className="px-5 py-3 font-medium text-hgh-muted">Balance</th>
                    <th className="px-5 py-3 font-medium text-hgh-muted">Monthly</th>
                    <th className="px-5 py-3 font-medium text-hgh-muted">Disbursed</th>
                    <th className="px-5 py-3 font-medium text-hgh-muted">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {empLoans === undefined ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-hgh-muted">
                        Loading loans…
                      </td>
                    </tr>
                  ) : empLoans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-hgh-muted">
                        No loans on file for this employee.
                      </td>
                    </tr>
                  ) : (
                    empLoans.map((loan) => (
                      <tr key={loan.id} className="border-b border-hgh-border last:border-0">
                        <td className="px-5 py-3 font-medium text-hgh-navy">{loan.type}</td>
                        <td className="px-5 py-3 tabular-nums">
                          GHS {Number(loan.amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3 tabular-nums">
                          GHS {Number(loan.balance).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3 tabular-nums">
                          GHS {Number(loan.monthlyRepayment).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3 text-hgh-muted">
                          {new Date(loan.disbursedAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={loanStatusBadge[loan.status as keyof typeof loanStatusBadge] ?? "default"}>
                            {loan.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Upload Document Dialog */}
      <Dialog open={docDialogOpen} onClose={() => setDocDialogOpen(false)} title="Upload Document">
        <form onSubmit={onUploadDoc} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate">Document Name</label>
            <Input placeholder="e.g. ID Card, Employment Contract" {...regDoc("name")} />
            {docErrors.name && <p className="mt-1 text-xs text-hgh-danger">{docErrors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate">File</label>
            <Input type="file" {...regDoc("file")} />
            {docErrors.file && <p className="mt-1 text-xs text-hgh-danger">{String(docErrors.file.message)}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setDocDialogOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submittingDoc}>
              {submittingDoc ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Add Component Dialog */}
      <Dialog open={compDialogOpen} onClose={() => setCompDialogOpen(false)} title="Add Salary Component">
        <form onSubmit={onAddComp} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
                      <SelectItem value="ALLOWANCE">Allowance</SelectItem>
                      <SelectItem value="DEDUCTION">Deduction</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">Name</label>
              <Input placeholder="e.g. Housing Allowance" {...register("name")} />
              {errors.name && <p className="mt-1 text-xs text-hgh-danger">{errors.name.message}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">Amount (GHS)</label>
              <Input type="number" step="0.01" {...register("amount")} />
              {errors.amount && <p className="mt-1 text-xs text-hgh-danger">{errors.amount.message}</p>}
            </div>
            <div className="flex items-center gap-2 pt-8">
              <input type="checkbox" id="isRecurring" {...register("isRecurring")} />
              <label htmlFor="isRecurring" className="text-sm font-medium text-hgh-slate">Recurring every month</label>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">Start Date</label>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <DatePickerField value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">End Date (Optional)</label>
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <DatePickerField value={field.value || ""} onChange={field.onChange} />
                )}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate">Note</label>
            <Input placeholder="Optional reference..." {...register("note")} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setCompDialogOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submittingComp}>
              {submittingComp ? "Adding..." : "Add Component"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} title="Edit Employee Profile">
        <form onSubmit={onUpdateProfile} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate">Name</label>
            <Input {...regProfile("name")} />
            {profileErrors.name && (
              <p className="mt-1 text-xs text-hgh-danger">{profileErrors.name.message}</p>
            )}
            <p className="mt-1 text-xs text-hgh-muted">Shown in the app; portal account name may differ if linked.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">Department</label>
              <Controller
                name="department"
                control={controlProfile}
                render={({ field }) => (
                  <SearchablePicklist
                    value={field.value}
                    onChange={field.onChange}
                    options={fieldOptions?.departments ?? []}
                    placeholder="Search or pick department…"
                    aria-invalid={profileErrors.department ? true : undefined}
                  />
                )}
              />
              {profileErrors.department && <p className="mt-1 text-xs text-hgh-danger">{profileErrors.department.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">Job Title</label>
              <Controller
                name="jobTitle"
                control={controlProfile}
                render={({ field }) => (
                  <SearchablePicklist
                    value={field.value}
                    onChange={field.onChange}
                    options={fieldOptions?.jobTitles ?? []}
                    placeholder="Search or pick job title…"
                    aria-invalid={profileErrors.jobTitle ? true : undefined}
                  />
                )}
              />
              {profileErrors.jobTitle && <p className="mt-1 text-xs text-hgh-danger">{profileErrors.jobTitle.message}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">Employment Type</label>
              <Controller
                name="employmentType"
                control={controlProfile}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
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
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">Basic Salary (GHS)</label>
              <Input type="number" step="0.01" {...regProfile("basicSalary")} />
              {profileErrors.basicSalary && <p className="mt-1 text-xs text-hgh-danger">{profileErrors.basicSalary.message}</p>}
            </div>
          </div>
          {isPayrollAdmin ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">Start date</label>
              <Controller
                name="startDate"
                control={controlProfile}
                render={({ field }) => (
                  <DatePickerField
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Start date"
                    aria-invalid={profileErrors.startDate ? true : undefined}
                  />
                )}
              />
              {profileErrors.startDate && (
                <p className="mt-1 text-xs text-hgh-danger">{profileErrors.startDate.message}</p>
              )}
            </div>
          ) : null}
          {employee?.userId && me?.id === employee.userId ? (
            <p className="text-xs text-hgh-muted">
              Tax and bank details can only be updated by an HR or company administrator.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-hgh-slate">SSNIT Number</label>
                  <Input
                    {...regProfile("ssnit")}
                    placeholder={revealed ? "" : "Loading…"}
                    disabled={!revealed}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-hgh-slate">TIN</label>
                  <Input {...regProfile("tin")} placeholder={revealed ? "" : "Loading…"} disabled={!revealed} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-hgh-slate">Bank Name</label>
                  <Controller
                    name="bankName"
                    control={controlProfile}
                    render={({ field }) => (
                      <GhanaBankField
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        disabled={!revealed}
                        placeholder={revealed ? "Select or type bank" : "Loading…"}
                      />
                    )}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-hgh-slate">Bank Branch</label>
                  <Controller
                    name="bankBranch"
                    control={controlProfile}
                    render={({ field }) => (
                      <GhanaBranchField
                        bankName={(bankNameWatch ?? "").trim()}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        disabled={!revealed}
                        placeholder={revealed ? "Branch (type or pick suggestion)" : "Loading…"}
                      />
                    )}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-hgh-slate">Bank Account Number</label>
                <Input
                  {...regProfile("bankAccount")}
                  placeholder={revealed ? "" : "Loading…"}
                  disabled={!revealed}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 border-t border-hgh-border pt-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-hgh-slate">Mobile money network</label>
                  <Controller
                    name="momoProvider"
                    control={controlProfile}
                    render={({ field }) => (
                      <Select
                        value={field.value?.trim() ? field.value : "__none__"}
                        onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                        disabled={!revealed}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={revealed ? "None" : "Loading…"} />
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
                  {profileErrors.momoProvider && (
                    <p className="mt-1 text-xs text-hgh-danger">{profileErrors.momoProvider.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-hgh-slate">MoMo wallet number</label>
                  <Input
                    {...regProfile("momoMsisdn")}
                    placeholder={revealed ? "e.g. 0244123456" : "Loading…"}
                    disabled={!revealed}
                    inputMode="numeric"
                    autoComplete="off"
                  />
                  {profileErrors.momoMsisdn && (
                    <p className="mt-1 text-xs text-hgh-danger">{profileErrors.momoMsisdn.message}</p>
                  )}
                </div>
              </div>
              {!revealed && (
                <p className="text-xs text-hgh-muted">
                  Unlocking these fields… if they stay grey, click <strong>Reveal</strong> on the profile card above.
                </p>
              )}
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submittingProfile}>
              {submittingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={detailConfirm !== null}
        onClose={() => !detailConfirmBusy && setDetailConfirm(null)}
        title={
          detailConfirm?.type === "endEmployment"
            ? "End employment"
            : detailConfirm?.type === "deleteComponent"
              ? "Remove salary component"
              : detailConfirm?.type === "deleteDocument"
                ? "Delete document"
                : detailConfirm?.type === "deleteTask"
                  ? "Remove onboarding task"
                  : "Confirm"
        }
        description={
          detailConfirm?.type === "endEmployment" && employee ? (
            <>
              End active employment for{" "}
              <strong className="text-hgh-navy">{employeeDisplayName(employee)}</strong> (
              <span className="tabular-nums font-medium">{employee.employeeCode}</span>)? They will be marked
              terminated and won&apos;t appear on new payroll runs. Historical payslips stay available.
            </>
          ) : detailConfirm?.type === "deleteComponent" ? (
            <>This recurring allowance or deduction will be removed. Calculations on past approved pay runs do not change.</>
          ) : detailConfirm?.type === "deleteDocument" ? (
            <>This document will be removed from the employee&apos;s file list.</>
          ) : detailConfirm?.type === "deleteTask" ? (
            <>
              Remove the onboarding task{" "}
              <strong className="text-hgh-navy">&ldquo;{detailConfirm.title}&rdquo;</strong>?
            </>
          ) : (
            ""
          )
        }
        confirmLabel={
          detailConfirm?.type === "endEmployment"
            ? "End employment"
            : detailConfirm?.type === "deleteComponent"
              ? "Remove component"
              : detailConfirm?.type === "deleteDocument"
                ? "Delete document"
                : detailConfirm?.type === "deleteTask"
                  ? "Remove task"
                  : "Continue"
        }
        acknowledgeText={
          detailConfirm?.type === "endEmployment"
            ? "I confirm I want to end this person’s active employment for this company."
            : "I understand and want to continue with this action."
        }
        onConfirm={handleDetailConfirm}
        busy={detailConfirmBusy}
      />
    </div>
  );
}

export default function EmployeeDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-hgh-border" />
          <div className="h-64 rounded-xl bg-hgh-border" />
        </div>
      }
    >
      <EmployeeDetailPageContent />
    </Suspense>
  );
}
