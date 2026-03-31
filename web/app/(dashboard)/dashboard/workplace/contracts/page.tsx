"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";

type Emp = {
  id: string;
  employeeCode: string;
  name: string | null;
  probationEndDate: string | null;
  contractType: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
};

export default function WorkplaceContractsPage() {
  const { selected } = useCompany();
  const url = selected ? `/api/employees?companyId=${selected.id}` : null;
  const { data: employees } = useApi<Emp[]>(url);

  return (
    <div className="space-y-6">
      <Link href="/dashboard/workplace" className="inline-flex items-center gap-1 text-sm text-hgh-gold hover:underline">
        <ArrowLeft size={16} aria-hidden /> Workplace
      </Link>
      <h1 className="text-xl font-semibold text-hgh-navy">Probation &amp; contracts</h1>
      <p className="text-sm text-hgh-muted">
        Edit dates on each employee profile (payroll admin). This view is a read-only summary.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active employees</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hgh-border text-left text-hgh-muted">
                <th className="pb-2">Code</th>
                <th className="pb-2">Name</th>
                <th className="pb-2">Probation end</th>
                <th className="pb-2">Contract</th>
                <th className="pb-2">Start</th>
                <th className="pb-2">End</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {(employees ?? []).map((e) => (
                <tr key={e.id} className="border-b border-hgh-border/80">
                  <td className="py-2 font-mono text-xs">{e.employeeCode}</td>
                  <td className="py-2">{(e as Emp).name || "—"}</td>
                  <td className="py-2">
                    {e.probationEndDate ? new Date(e.probationEndDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-2">{e.contractType || "—"}</td>
                  <td className="py-2">
                    {e.contractStartDate ? new Date(e.contractStartDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-2">
                    {e.contractEndDate ? new Date(e.contractEndDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-2">
                    <Link href={`/dashboard/employees/${e.id}`} className="text-hgh-gold hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
