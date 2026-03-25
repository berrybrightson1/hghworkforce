"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { useApi } from "@/lib/swr";

const schema = z.object({
  name: z.string().min(2, "Company name is required"),
  registrationNumber: z.string().optional(),
  address: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CompaniesPage() {
  const router = useRouter();
  const { companies, loading, refresh, select } = useCompany();
  const { data: me } = useApi<{ role: string }>("/api/me");
  const canCreateCompany = me?.role === "SUPER_ADMIN";
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to create company");
      }
      toast.success(`"${values.name}" created successfully.`);
      reset();
      setDialogOpen(false);
      refresh();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to create company. Check your database connection.",
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">Companies</h2>
          <p className="text-sm text-hgh-muted">
            Manage all registered companies under HGH.
          </p>
        </div>
        {canCreateCompany && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={18} />
            Add Company
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-hgh-border bg-white" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-hgh-muted">
            <Building2 size={32} className="mx-auto mb-3 text-hgh-border" />
            <p>No companies yet.</p>
            {canCreateCompany ? (
              <p className="mt-1">Click &quot;Add Company&quot; to create your first one.</p>
            ) : (
              <p className="mt-1">Ask a Super Admin to register your organization.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card key={company.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-hgh-navy/5">
                  <Building2 size={20} className="text-hgh-navy" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-sm">{company.name}</CardTitle>
                  <p className="text-xs text-hgh-muted">
                    {company._count?.employees ?? 0} employees
                  </p>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant={company.isActive ? "success" : "default"}>
                  {company.isActive ? "Active" : "Inactive"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    select(company.id);
                    router.push("/dashboard/employees");
                  }}
                >
                  Manage
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Company Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Add Company">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate">
              Company Name <span className="text-hgh-danger">*</span>
            </label>
            <Input placeholder="e.g. Acme Logistics Ltd" {...register("name")} />
            {errors.name && <p className="mt-1 text-xs text-hgh-danger">{errors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate">
              Registration Number
            </label>
            <Input placeholder="e.g. GH-12345" {...register("registrationNumber")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-hgh-slate">Address</label>
            <Input placeholder="e.g. 15 Independence Ave, Accra" {...register("address")} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Company"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
