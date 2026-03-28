"use client";

import Link from "next/link";
import { Users, Building2, Banknote, CalendarDays, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";
import {
  PayrollTrendChart,
  type TrendData,
} from "@/components/dashboard/PayrollTrendChart";
import { EmployeeSetupReminder } from "@/components/dashboard/employee-setup-reminder";
import { MorningBriefing } from "@/components/dashboard/morning-briefing";
import { PayrollForecast } from "@/components/dashboard/payroll-forecast";
import { CostRevenueCompact } from "@/components/dashboard/cost-revenue-compact";
import { HintTooltip } from "@/components/ui/hint-tooltip";

type MeData = { name: string; role: string };

export default function DashboardPage() {
  const { companies, selected } = useCompany();
  const { data: me } = useApi<MeData>("/api/me");
  const { data: employees } = useApi<{ id: string }[]>(
    selected ? `/api/employees?companyId=${selected.id}` : null,
  );
  const { data: payruns } = useApi<{ id: string; status: string }[]>(
    selected ? `/api/payruns?companyId=${selected.id}` : null,
  );
  const { data: leaveRequests } = useApi<{ id: string; status: string }[]>(
    selected ? `/api/leave?companyId=${selected.id}` : null,
  );
  const { data: loans } = useApi<{ id: string; status: string }[]>(
    selected ? `/api/loans?companyId=${selected.id}` : null,
  );
  const { data: trends } = useApi<TrendData[]>(
    selected ? `/api/reports/payroll-trends?companyId=${selected.id}` : null,
  );
  const { data: insights } = useApi<{
    headcount: number;
    attendanceRateApprox: number;
    checkInSessionsApprox: number;
    pendingAttendanceCorrections: number;
    lastApprovedPayrun: {
      id: string;
      periodEnd: string;
      totalNet: string;
      lineCount: number;
    } | null;
  }>(selected ? `/api/dashboard/insights?companyId=${selected.id}` : null);

  const isManager = me && ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"].includes(me.role);
  const empCount = employees?.length ?? 0;
  const pendingLeave = leaveRequests?.filter((r) => r.status === "PENDING").length ?? 0;
  const activeLoans = loans?.filter((l) => l.status === "ACTIVE").length ?? 0;
  const draftPayruns = payruns?.filter((p) => p.status === "DRAFT").length ?? 0;

  const stats = [
    {
      label: "Employees",
      value: empCount,
      icon: Users,
      href: "/dashboard/employees",
      hint: "Open the employee directory for this workspace: payroll codes, salaries, and profiles.",
    },
    {
      label: "Companies",
      value: companies.length,
      icon: Building2,
      href: "/dashboard/companies",
      hint: "Switch or manage company workspaces you administer.",
    },
    {
      label: "Draft Pay Runs",
      value: draftPayruns,
      icon: Banknote,
      href: "/dashboard/payroll",
      hint: "Open payroll to create or continue pay runs and generate lines.",
    },
    {
      label: "Pending Leave",
      value: pendingLeave,
      icon: CalendarDays,
      href: "/dashboard/leave",
      hint: "Review leave requests and balances for this company.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Morning Briefing — canManage() roles only */}
      {isManager && me && <MorningBriefing userName={me.name} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">Overview</h2>
          <p className="text-sm text-hgh-muted">
            {selected ? `Viewing ${selected.name}` : "Select a company to see details."}
          </p>
        </div>
        <Badge variant="success">Live</Badge>
      </div>

      <EmployeeSetupReminder companyId={selected?.id ?? null} />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <HintTooltip key={s.label} content={s.hint}>
              <Link href={s.href}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-4 py-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-hgh-gold/10">
                      <Icon size={20} className="text-hgh-gold" />
                    </div>
                    <div>
                      <p className="text-xs text-hgh-muted">{s.label}</p>
                      <p className="text-lg font-semibold text-hgh-navy">{s.value}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </HintTooltip>
          );
        })}
      </div>

      {/* Payroll Forecast — canManage() roles only */}
      {isManager && <PayrollForecast />}

      {/* Cost vs Revenue compact — canManage() roles only */}
      {isManager && <CostRevenueCompact />}

      {selected && insights && (
        <Card>
          <CardHeader>
            <CardTitle>Insights (approx.)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-hgh-muted">Active headcount</p>
              <p className="text-lg font-semibold text-hgh-navy">{insights.headcount}</p>
            </div>
            <div>
              <p className="text-xs text-hgh-muted">Attendance rate (30d, rough)</p>
              <p className="text-lg font-semibold text-hgh-navy">{insights.attendanceRateApprox}%</p>
            </div>
            <div>
              <p className="text-xs text-hgh-muted">Check-in days recorded</p>
              <p className="text-lg font-semibold text-hgh-navy">{insights.checkInSessionsApprox}</p>
            </div>
            <div>
              <p className="text-xs text-hgh-muted">Pending attendance fixes</p>
              <p className="text-lg font-semibold text-hgh-navy">
                {insights.pendingAttendanceCorrections}
              </p>
            </div>
            {insights.lastApprovedPayrun && (
              <div className="rounded-lg border border-hgh-border/80 bg-hgh-offwhite/50 p-3 sm:col-span-2 lg:col-span-4">
                <p className="text-xs text-hgh-muted">Latest approved pay run</p>
                <p className="mt-1 font-medium text-hgh-navy">
                  End {new Date(insights.lastApprovedPayrun.periodEnd).toLocaleDateString()} ·{" "}
                  {insights.lastApprovedPayrun.lineCount} lines · GHS{" "}
                  {Number(insights.lastApprovedPayrun.totalNet).toLocaleString("en-GH", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  net
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {selected && trends && trends.length > 0 && (
        <PayrollTrendChart data={trends} />
      )}

      {/* Quick-access */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Payroll</CardTitle>
            <HintTooltip content="Go to Payroll: draft runs, approvals, and exports for this company.">
              <Link href="/dashboard/payroll">
                <Button variant="ghost" size="sm">
                  View <ArrowRight size={14} />
                </Button>
              </Link>
            </HintTooltip>
          </CardHeader>
          <CardContent className="text-sm text-hgh-muted">
            {draftPayruns > 0
              ? `${draftPayruns} draft pay run(s) awaiting submission.`
              : "No draft pay runs. Create one from the Payroll page."}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Leave Requests</CardTitle>
            <HintTooltip content="Open Leave to approve requests and see team balances.">
              <Link href="/dashboard/leave">
                <Button variant="ghost" size="sm">
                  View <ArrowRight size={14} />
                </Button>
              </Link>
            </HintTooltip>
          </CardHeader>
          <CardContent className="text-sm text-hgh-muted">
            {pendingLeave > 0
              ? `${pendingLeave} pending request(s) need review.`
              : "No pending leave requests."}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active Loans</CardTitle>
            <HintTooltip content="Open Loans to manage staff advances and payroll deductions.">
              <Link href="/dashboard/loans">
                <Button variant="ghost" size="sm">
                  View <ArrowRight size={14} />
                </Button>
              </Link>
            </HintTooltip>
          </CardHeader>
          <CardContent className="text-sm text-hgh-muted">
            {activeLoans > 0
              ? `${activeLoans} active loan(s) with ongoing deductions.`
              : "No active loans or advances."}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
