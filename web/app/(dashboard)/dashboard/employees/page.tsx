"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Search, Upload } from "lucide-react";
import Papa from "papaparse";
import { Controller, useForm } from "react-hook-form";
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
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { useApi } from "@/lib/swr";
import { employeeDisplayName } from "@/lib/employee-display";

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
}

const schema = z.object({
  name: z.string().min(1, "Employee name is required"),
  department: z.string().min(1, "Department is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  basicSalary: z.coerce.number().positive("Must be greater than 0"),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACTOR"]),
  startDate: z.string().min(1, "Start date is required"),
});
type FormValues = z.infer<typeof schema>;

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

  const url = selected
    ? `/api/employees?companyId=${selected.id}${search ? `&q=${encodeURIComponent(search)}` : ""}`
    : null;
  const { data: employees, mutate } = useApi<Employee[]>(url);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employmentType: "FULL_TIME", startDate: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!selected) {
      toast.error("Select a company first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, companyId: selected.id }),
      });
      const created = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(typeof created?.error === "string" ? created.error : "Failed to create employee");
      }
      const label =
        created && typeof created === "object" && "employeeCode" in created
          ? employeeDisplayName(created as Employee)
          : values.name;
      toast.success(`${label} added · code ${(created as Employee)?.employeeCode ?? "assigned"}`);
      reset();
      setDialogOpen(false);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create employee.");
    } finally {
      setSubmitting(false);
    }
  });

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: { data: unknown[] }) => {
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
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)} disabled={!selected}>
            <Upload size={18} />
            Import CSV
          </Button>
          <Button onClick={() => setDialogOpen(true)} disabled={!selected}>
            <Plus size={18} />
            Add Employee
          </Button>
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
                <th className="px-5 py-3 font-medium text-hgh-muted">Name</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">Code</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">Department</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">Job Title</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">Basic Salary</th>
                <th className="px-5 py-3 font-medium text-hgh-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-hgh-muted">
                    <Users size={32} className="mx-auto mb-3 text-hgh-border" />
                    <p>{selected ? "No employees found." : "Select a company from the sidebar."}</p>
                  </td>
                </tr>
              ) : (
                list.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b border-hgh-border last:border-0 hover:bg-hgh-offwhite/50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/employees/${emp.id}`)}
                  >
                    <td className="px-5 py-3 font-medium text-hgh-navy">{employeeDisplayName(emp)}</td>
                    <td className="px-5 py-3 text-hgh-muted tabular-nums">{emp.employeeCode}</td>
                    <td className="px-5 py-3">{emp.department}</td>
                    <td className="px-5 py-3">{emp.jobTitle}</td>
                    <td className="px-5 py-3 tabular-nums">
                      GHS {Number(emp.basicSalary).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={statusBadge[emp.status]}>{emp.status}</Badge>
                    </td>
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Add Employee">
        <form onSubmit={onSubmit} className="space-y-4">
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
              <Input placeholder="e.g. Operations" {...register("department")} />
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
              <Input placeholder="e.g. Warehouse Manager" {...register("jobTitle")} />
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
    </div>
  );
}
