"use client";

import { FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/lib/swr";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Payslip {
  id: string;
  payrunLineId: string;
  createdAt: string;
  payrunLine: {
    netPay: string;
    payrun: {
      periodStart: string;
      periodEnd: string;
    };
  };
}

export default function PayslipsPage() {
  const { data: payslips, isLoading } = useApi<Payslip[]>("/api/me/payslips");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-hgh-navy">Payslips</h1>
        <p className="mt-1 text-sm text-hgh-muted">
          View and download all your salary statements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Payslips</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-10 rounded bg-hgh-offwhite" />
              <div className="h-10 rounded bg-hgh-offwhite" />
              <div className="h-10 rounded bg-hgh-offwhite" />
              <div className="h-10 rounded bg-hgh-offwhite" />
              <div className="h-10 rounded bg-hgh-offwhite" />
            </div>
          ) : !payslips || payslips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-hgh-muted">
              <FileText size={40} className="mb-3 opacity-40" />
              <p className="text-sm font-medium">No payslips available yet</p>
              <p className="mt-1 text-xs">
                Your payslips will appear here once they are generated.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hgh-border text-left">
                    <th className="pb-2 font-medium text-hgh-muted">Period</th>
                    <th className="pb-2 font-medium text-hgh-muted text-right">
                      Net Pay
                    </th>
                    <th className="pb-2 font-medium text-hgh-muted">
                      Generated
                    </th>
                    <th className="pb-2 font-medium text-hgh-muted text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hgh-border">
                  {payslips.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3">
                        {new Date(
                          p.payrunLine.payrun.periodStart
                        ).toLocaleDateString()}{" "}
                        -{" "}
                        {new Date(
                          p.payrunLine.payrun.periodEnd
                        ).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right tabular-nums font-medium text-hgh-navy">
                        GHS{" "}
                        {Number(p.payrunLine.netPay).toLocaleString("en-GH", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 text-hgh-muted">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <a
                          href={`/api/payslips/${p.payrunLineId}/download`}
                          download
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "text-hgh-navy no-underline",
                          )}
                        >
                          <Download size={16} className="mr-1" />
                          PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
