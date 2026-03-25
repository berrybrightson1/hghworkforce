"use client";

import Link from "next/link";
import { CalendarDays, Landmark, FileText, Download } from "lucide-react";
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

export default function PortalHomePage() {
  const { data: payslips, isLoading } = useApi<Payslip[]>("/api/me/payslips");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-hgh-navy">Welcome</h1>
        <p className="mt-1 text-sm text-hgh-muted">
          Access your documents, request leave, and track your loans.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/portal/leave">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-hgh-navy/5">
                <CalendarDays className="text-hgh-navy" size={20} />
              </div>
              <CardTitle className="text-base">Leave</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-hgh-muted">
                Request time off and track your balances.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/loans">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-hgh-navy/5">
                <Landmark className="text-hgh-navy" size={20} />
              </div>
              <CardTitle className="text-base">Loans & Advances</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-hgh-muted">
                View your active loans and balances.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/payslips">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-hgh-navy/5">
                <FileText className="text-hgh-navy" size={20} />
              </div>
              <CardTitle className="text-base">My Payslips</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-hgh-muted">
                Download your monthly salary statements.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Payslips</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-10 rounded bg-hgh-offwhite" />
              <div className="h-10 rounded bg-hgh-offwhite" />
            </div>
          ) : !payslips || payslips.length === 0 ? (
            <div className="py-8 text-center text-sm text-hgh-muted">
              No payslips available yet.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hgh-border text-left">
                      <th className="pb-2 font-medium text-hgh-muted">Period</th>
                      <th className="pb-2 font-medium text-hgh-muted text-right">Net Pay</th>
                      <th className="pb-2 font-medium text-hgh-muted text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hgh-border">
                    {payslips.slice(0, 5).map((p) => (
                      <tr key={p.id}>
                        <td className="py-3">
                          {new Date(p.payrunLine.payrun.periodStart).toLocaleDateString()} -{" "}
                          {new Date(p.payrunLine.payrun.periodEnd).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-right tabular-nums font-medium text-hgh-navy">
                          GHS {Number(p.payrunLine.netPay).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
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
              <div className="mt-4 text-center">
                <Link
                  href="/portal/payslips"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                    "inline-flex no-underline",
                  )}
                >
                  View all payslips
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
