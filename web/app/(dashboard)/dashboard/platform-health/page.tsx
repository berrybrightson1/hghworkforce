import { redirect } from "next/navigation";
import { Activity, Building2, Users, Banknote, CalendarDays, AlertTriangle } from "lucide-react";
import { ensureAppUser } from "@/lib/ensure-app-user";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import {
  PlatformCompaniesAccessBrowser,
  type PlatformCompanyAccessRow,
} from "@/components/dashboard/platform-companies-access-browser";

export default async function PlatformHealthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/dashboard/platform-health");

  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    user.email ||
    "User";
  const dbUser = await ensureAppUser(user, displayName);
  if (dbUser.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [
    companies,
    activeUsers,
    activeEmployees,
    payrunsLast30,
    pendingLeave,
    pendingCorrections,
    bySubscription,
    allCompaniesRows,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.employee.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.payrun.count({ where: { createdAt: { gte: since } } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.attendanceCorrectionRequest.count({ where: { status: "PENDING" } }),
    prisma.company.groupBy({
      by: ["subscriptionStatus"],
      _count: { id: true },
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        createdAt: true,
        _count: { select: { employees: true } },
      },
    }),
  ]);

  const companiesForBrowser: PlatformCompanyAccessRow[] = allCompaniesRows.map((c) => ({
    id: c.id,
    name: c.name,
    subscriptionStatus: c.subscriptionStatus,
    trialEndsAtIso: c.trialEndsAt ? c.trialEndsAt.toISOString() : null,
    createdAtIso: c.createdAt.toISOString(),
    employeeCount: c._count.employees,
  }));

  const snapshotAt = new Date();

  const statCards = [
    { label: "Companies", value: companies, icon: Building2 },
    { label: "Active users", value: activeUsers, icon: Users },
    { label: "Active employees", value: activeEmployees, icon: Users },
    { label: "Pay runs (30d)", value: payrunsLast30, icon: Banknote },
    { label: "Pending leave", value: pendingLeave, icon: CalendarDays },
    { label: "Pending attendance fixes", value: pendingCorrections, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hgh-gold/15 text-hgh-gold">
          <Activity size={22} aria-hidden />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">Platform health</h2>
          <p className="text-sm text-hgh-muted">
            Cross-tenant snapshot for operators (super admin only). Search all workspaces below to grant or revoke paid
            access.
          </p>
          <p className="mt-2 text-xs tabular-nums text-hgh-muted">
            Figures snapshot: {snapshotAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 py-4">
                <Icon className="shrink-0 text-hgh-gold" size={22} aria-hidden />
                <div>
                  <p className="text-xs text-hgh-muted">{s.label}</p>
                  <p className="text-lg font-semibold tabular-nums text-hgh-navy">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Companies by subscription status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {bySubscription.map((p) => (
            <Badge key={p.subscriptionStatus} variant="default">
              {p.subscriptionStatus}: {p._count.id}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspaces & access</CardTitle>
          <p className="text-sm font-normal text-hgh-muted">
            Full tenant list (A–Z). Use search to find older companies quickly.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <PlatformCompaniesAccessBrowser companies={companiesForBrowser} />
        </CardContent>
      </Card>
    </div>
  );
}
