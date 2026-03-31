"use client";

import Link from "next/link";
import {
  Briefcase,
  Calendar,
  ClipboardList,
  FileText,
  MessageSquare,
  UserCircle,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";

const links = [
  { href: "/dashboard/workplace/holidays", label: "Public holidays", icon: Calendar, desc: "Calendar + Ghana template seed" },
  { href: "/dashboard/workplace/lateness", label: "Lateness & warnings", icon: ClipboardList, desc: "Policy, late records, letters" },
  { href: "/dashboard/workplace/comms", label: "Notices & queries", icon: MessageSquare, desc: "Broadcasts, pay queries, anonymous feedback, profile requests" },
  { href: "/dashboard/workplace/contracts", label: "Probation & contracts", icon: Users, desc: "Dates on employee records (edit on employee profile)" },
] as const;

export default function WorkplaceHubPage() {
  const { selected } = useCompany();
  const celUrl = selected ? `/api/dashboard/celebrations?companyId=${selected.id}` : null;
  const { data: cel } = useApi<{
    enabled: boolean;
    birthdays: { name: string; code: string; nextDate: string }[];
    anniversaries: { name: string; code: string; years: number; nextDate: string }[];
  }>(celUrl);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hgh-gold/15 text-hgh-gold">
          <Briefcase size={22} aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-hgh-navy">Workplace</h1>
          <p className="mt-1 text-sm text-hgh-muted">
            HR tools: holidays, lateness, communications, and employee lifecycle fields.
          </p>
        </div>
      </div>

      {cel?.enabled && (cel.birthdays.length > 0 || cel.anniversaries.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCircle size={18} aria-hidden />
              Upcoming celebrations
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            {cel.birthdays.length > 0 ? (
              <div>
                <p className="font-medium text-hgh-navy">Birthdays</p>
                <ul className="mt-2 space-y-1 text-hgh-muted">
                  {cel.birthdays.slice(0, 8).map((b) => (
                    <li key={`${b.code}-${b.nextDate}`}>
                      {b.name} · {b.nextDate}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {cel.anniversaries.length > 0 ? (
              <div>
                <p className="font-medium text-hgh-navy">Work anniversaries</p>
                <ul className="mt-2 space-y-1 text-hgh-muted">
                  {cel.anniversaries.slice(0, 8).map((a) => (
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

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full transition hover:border-hgh-gold/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <item.icon size={18} className="text-hgh-gold" aria-hidden />
                  {item.label}
                </CardTitle>
                <p className="text-sm font-normal text-hgh-muted">{item.desc}</p>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-hgh-gold">Open →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText size={18} aria-hidden />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-hgh-muted">
          <p>
            Payslip colours, overtime multipliers, and birthday widget:{" "}
            <Link href="/dashboard/settings/tier2-pension" className="text-hgh-gold underline underline-offset-2">
              Settings → Payroll & payslip branding
            </Link>
          </p>
          <p className="mt-2">
            Audit CSV export and filters:{" "}
            <Link href="/dashboard/settings/audit" className="text-hgh-gold underline underline-offset-2">
              Settings → Audit log
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
