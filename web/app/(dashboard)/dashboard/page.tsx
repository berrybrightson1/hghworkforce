"use client";

import Link from "next/link";
import {
  Users,
  Building2,
  Banknote,
  CalendarDays,
  ArrowRight,
  UserCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";
import {
  PayrollTrendChart,
  type TrendData,
} from "@/components/dashboard/PayrollTrendChart";
import { MorningBriefing } from "@/components/dashboard/morning-briefing";
import { PayrollForecast } from "@/components/dashboard/payroll-forecast";
import { CostRevenueCompact } from "@/components/dashboard/cost-revenue-compact";
import { HintTooltip } from "@/components/ui/hint-tooltip";

type MeData = { name: string; role: string; email: string; greetingName: string };

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
  const isCompanyAdmin =
    me && (me.role === "SUPER_ADMIN" || me.role === "COMPANY_ADMIN");
  const { data: celebrations } = useApi<{
    enabled: boolean;
    birthdays: { name: string; code: string; nextDate: string }[];
    anniversaries: { name: string; code: string; years: number; nextDate: string }[];
  }>(
    isManager && selected
      ? `/api/dashboard/celebrations?companyId=${selected.id}`
      : null,
  );
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
      hint: "Open the employee directory: payroll codes, salaries, profiles, and kiosk device binding status.",
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
      {/* Morning briefing + flip clock — HR and company admins (same people as manager dashboard tools). */}
      {isManager && me && <MorningBriefing greetingName={me.greetingName} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">Overview</h2>
          <p className="text-sm text-hgh-muted">
            {selected ? `Viewing ${selected.name}` : "Select a company to see details."}
          </p>
        </div>
        <Badge variant="success">Live</Badge>
      </div>

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

      {isManager &&
        selected &&
        celebrations?.enabled &&
        (celebrations.birthdays.length > 0 || celebrations.anniversaries.length > 0) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <UserCircle size={18} className="text-hgh-gold" aria-hidden />
                Upcoming celebrations
              </CardTitle>
              <HintTooltip content="Birthdays and work anniversaries from employee records. Configure in Settings → Payroll & payslip branding.">
                <Link href="/dashboard/workplace">
                  <Button variant="ghost" size="sm">
                    Workplace <ArrowRight size={14} />
                  </Button>
                </Link>
              </HintTooltip>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              {celebrations.birthdays.length > 0 ? (
                <div>
                  <p className="font-medium text-hgh-navy">Birthdays</p>
                  <ul className="mt-2 space-y-1 text-hgh-muted">
                    {celebrations.birthdays.slice(0, 6).map((b) => (
                      <li key={`${b.code}-${b.nextDate}`}>
                        {b.name} · {b.nextDate}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {celebrations.anniversaries.length > 0 ? (
                <div>
                  <p className="font-medium text-hgh-navy">Work anniversaries</p>
                  <ul className="mt-2 space-y-1 text-hgh-muted">
                    {celebrations.anniversaries.slice(0, 6).map((a) => (
                      <li key={`${a.code}-${a.nextDate}`}>
                        {a.name} · {a.years} yr · {a.nextDate}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

      {/* Payroll Forecast — company admins only */}
      {isCompanyAdmin && <PayrollForecast />}

      {/* Cost vs Revenue compact — company admins only */}
      {isCompanyAdmin && <CostRevenueCompact />}

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
            <Link href="/dashboard/payroll">
              <Button variant="ghost" size="sm">
                View <ArrowRight size={14} />
              </Button>
            </Link>
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
            <Link href="/dashboard/leave">
              <Button variant="ghost" size="sm">
                View <ArrowRight size={14} />
              </Button>
            </Link>
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
            <Link href="/dashboard/loans">
              <Button variant="ghost" size="sm">
                View <ArrowRight size={14} />
              </Button>
            </Link>
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
