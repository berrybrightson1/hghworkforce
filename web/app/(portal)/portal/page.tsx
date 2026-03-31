"use client";

import Link from "next/link";
import {
  CalendarDays,
  Landmark,
  FileText,
  Download,
  Bell,
  ClipboardList,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/lib/swr";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardSummary = {
  lastPayslip: {
    id: string;
    payrunLineId: string;
    createdAt: string;
    payrunLine: {
      netPay: string;
      payrun: { periodStart: string; periodEnd: string };
    };
  } | null;
  unreadNotifications: number;
  shifts: {
    id: string;
    shift: { name: string; startTime: string; endTime: string };
  }[];
  pendingLeave: number;
  pendingLoans: number;
  pendingCorrections: number;
};

export default function PortalHomePage() {
  const { data: s, isLoading } = useApi<DashboardSummary>("/api/me/dashboard-summary");

  const last = s?.lastPayslip;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-hgh-navy">Welcome</h1>
        <p className="mt-1 text-sm text-hgh-muted">
          Your snapshot: notifications, schedule, and open requests.
        </p>
      </div>

      {isLoading || !s ? (
        <div className="h-36 animate-pulse rounded-xl border border-hgh-border bg-white" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <Bell className="shrink-0 text-hgh-gold" size={22} aria-hidden />
              <div>
                <p className="text-xs text-hgh-muted">Unread</p>
                <p className="text-lg font-semibold tabular-nums text-hgh-navy">{s.unreadNotifications}</p>
                <Link href="/portal/profile" className="text-[11px] text-hgh-gold hover:underline">
                  Open bell in header
                </Link>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <CalendarDays className="shrink-0 text-hgh-gold" size={22} aria-hidden />
              <div>
                <p className="text-xs text-hgh-muted">Leave pending</p>
                <p className="text-lg font-semibold tabular-nums text-hgh-navy">{s.pendingLeave}</p>
                <Link href="/portal/leave" className="text-[11px] text-hgh-gold hover:underline">
                  View leave
                </Link>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <Landmark className="shrink-0 text-hgh-gold" size={22} aria-hidden />
              <div>
                <p className="text-xs text-hgh-muted">Loan requests</p>
                <p className="text-lg font-semibold tabular-nums text-hgh-navy">{s.pendingLoans}</p>
                <Link href="/portal/loans" className="text-[11px] text-hgh-gold hover:underline">
                  View loans
                </Link>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <ClipboardList className="shrink-0 text-hgh-gold" size={22} aria-hidden />
              <div>
                <p className="text-xs text-hgh-muted">Corrections</p>
                <p className="text-lg font-semibold tabular-nums text-hgh-navy">{s.pendingCorrections}</p>
                <Link href="/portal/corrections" className="text-[11px] text-hgh-gold hover:underline">
                  Status
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && s && s.shifts.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Clock size={18} className="text-hgh-gold" />
            <CardTitle className="text-base">Next shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {s.shifts.slice(0, 3).map((a) => (
                <li key={a.id} className="flex justify-between gap-2">
                  <span className="font-medium text-hgh-navy">{a.shift.name}</span>
                  <span className="text-hgh-muted">
                    {a.shift.startTime}–{a.shift.endTime}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/portal/schedule"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mt-3 px-0 text-hgh-gold")}
            >
              Full schedule
            </Link>
          </CardContent>
        </Card>
      ) : null}

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
              <p className="text-sm text-hgh-muted">Request time off and track your balances.</p>
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
              <p className="text-sm text-hgh-muted">Request an advance or track repayments.</p>
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
              <p className="text-sm text-hgh-muted">Download your monthly salary statements.</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Latest payslip</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-12 animate-pulse rounded bg-hgh-offwhite" />
          ) : !last ? (
            <p className="text-sm text-hgh-muted">No payslips available yet.</p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-hgh-slate">
                  {new Date(last.payrunLine.payrun.periodStart).toLocaleDateString()} –{" "}
                  {new Date(last.payrunLine.payrun.periodEnd).toLocaleDateString()}
                </p>
                <p className="text-lg font-semibold tabular-nums text-hgh-navy">
                  GHS{" "}
                  {Number(last.payrunLine.netPay).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/portal/payslips/${last.payrunLineId}`}
                  className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "no-underline")}
                >
                  View
                </Link>
                <a
                  href={`/api/payslips/${last.payrunLineId}/download`}
                  download
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-hgh-navy no-underline")}
                >
                  <Download size={16} className="mr-1" />
                  PDF
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
