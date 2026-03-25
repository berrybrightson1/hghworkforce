"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Plus,
  Trash2,
  User,
  Wallet,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
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

interface Employee {
  id: string;
  userId: string | null;
  employeeCode: string;
  name?: string | null;
  user?: { email: string; name: string } | null;
  department: string;
  jobTitle: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACTOR";
  startDate: string;
  status: "ACTIVE" | "SUSPENDED" | "TERMINATED";
  basicSalary: string;
  company: { name: string };
  salaryComponents: SalaryComponent[];
  // Sensitive fields (masked by default)
  ssnit?: string;
  tin?: string;
  bankName?: string;
  bankAccount?: string;
  bankBranch?: string;
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

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  department: z.string().min(1, "Department is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACTOR"]),
  basicSalary: z.coerce.number().positive("Must be positive"),
  ssnit: z.string().optional(),
  tin: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankBranch: z.string().optional(),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

export default function EmployeeDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"profile" | "components" | "docs" | "leave" | "loans">("profile");
  const [compDialogOpen, setCompDialogOpen] = useState(false);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [submittingComp, setSubmittingComp] = useState(false);
  const [submittingDoc, setSubmittingDoc] = useState(false);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const { data: employee, mutate, isLoading, error } = useApi<Employee>(
    `/api/employees/${id}${revealed ? "?decrypt=true" : ""}`
  );
  const { data: me } = useApi<{ id: string }>("/api/me");
  const { data: documents, mutate: mutateDocs } = useApi<EmployeeDocument[]>(`/api/employees/${id}/documents`);

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

  // Sync profile form when employee data loads
  useEffect(() => {
    if (employee) {
      resetProfile({
        name: employee.name?.trim() || employee.user?.name || "",
        department: employee.department,
        jobTitle: employee.jobTitle,
        employmentType: employee.employmentType,
        basicSalary: Number(employee.basicSalary),
        ssnit: revealed ? employee.ssnit : "",
        tin: revealed ? employee.tin : "",
        bankName: revealed ? employee.bankName : "",
        bankAccount: revealed ? employee.bankAccount : "",
        bankBranch: revealed ? employee.bankBranch : "",
      });
    }
  }, [employee, resetProfile, revealed]);

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
      }
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success("Profile updated.");
      setEditDialogOpen(false);
      mutate();
    } catch {
      toast.error("Failed to update profile.");
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

  async function deleteComp(compId: string) {
    if (!confirm("Are you sure you want to remove this component?")) return;
    try {
      const res = await fetch(`/api/employees/${id}/components/${compId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Component removed.");
      mutate();
    } catch {
      toast.error("Failed to remove component.");
    }
  }

  async function deleteDoc(docId: string) {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`/api/employees/${id}/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Document deleted.");
      mutateDocs();
    } catch {
      toast.error("Failed to delete document.");
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
        <Badge variant={employee.status === "ACTIVE" ? "success" : "warning"}>{employee.status}</Badge>
      </div>

      <div className="flex border-b border-hgh-border">
        {(["profile", "components", "docs", "leave", "loans"] as const).map((tab) => (
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

      {activeTab === "profile" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <User size={18} />
                Employment Details
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setRevealed(!revealed)}>
                  {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
                  {revealed ? "Hide" : "Reveal"}
                </Button>
                <Button size="sm" onClick={openEditProfile}>
                  Edit Profile
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-hgh-muted">Name</p>
                  <p className="font-medium text-hgh-navy">{employeeDisplayName(employee)}</p>
                </div>
                <div>
                  <p className="text-xs text-hgh-muted">Employee Code</p>
                  <p className="font-medium text-hgh-navy">{employee.employeeCode}</p>
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
            <Button size="sm" onClick={() => setCompDialogOpen(true)}>
              <Plus size={16} />
              Add Component
            </Button>
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
                        <Button variant="ghost" size="sm" className="text-hgh-danger" onClick={() => deleteComp(c.id)}>
                          <Trash2 size={16} />
                        </Button>
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
            <Button size="sm" onClick={() => setDocDialogOpen(true)}>
              <Plus size={16} />
              Upload Document
            </Button>
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
                          <Button variant="ghost" size="sm" className="text-hgh-danger" onClick={() => deleteDoc(doc.id)}>
                            <Trash2 size={16} />
                          </Button>
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

      {/* Placeholders for other tabs */}
      {(activeTab === "leave" || activeTab === "loans") && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-hgh-muted">
            <div className="mb-4 rounded-full bg-hgh-offwhite p-4">
              {activeTab === "leave" && <Calendar size={32} />}
              {activeTab === "loans" && <CreditCard size={32} />}
            </div>
            <p>The {activeTab} section is coming soon.</p>
          </CardContent>
        </Card>
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
              <Input {...regProfile("department")} />
              {profileErrors.department && <p className="mt-1 text-xs text-hgh-danger">{profileErrors.department.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-hgh-slate">Job Title</label>
              <Input {...regProfile("jobTitle")} />
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
                <div>
                  <label className="mb-1 block text-sm font-medium text-hgh-slate">Bank Name</label>
                  <Input
                    {...regProfile("bankName")}
                    placeholder={revealed ? "" : "Loading…"}
                    disabled={!revealed}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-hgh-slate">Bank Branch</label>
                  <Input
                    {...regProfile("bankBranch")}
                    placeholder={revealed ? "" : "Loading…"}
                    disabled={!revealed}
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
    </div>
  );
}
