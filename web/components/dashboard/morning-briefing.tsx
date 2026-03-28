"use client";

import { Users, Clock, ClipboardList, Banknote } from "lucide-react";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";

type BriefingData = {
  todayAttendance: { present: number; late: number; absent: number };
  pendingApprovals: number;
  monthSalaryLiability: number;
};

function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${name}.`;
  if (h < 17) return `Good afternoon, ${name}.`;
  return `Good evening, ${name}.`;
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-GH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatGHS(amount: number): string {
  return amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MorningBriefing({ userName }: { userName: string }) {
  const { selected } = useCompany();
  const { data } = useApi<BriefingData>(
    selected ? `/api/dashboard/briefing?companyId=${selected.id}` : null,
  );

  if (!data) return null;

  const firstName = userName.split(" ")[0];
  const cards = [
    {
      icon: Users,
      label: `${data.todayAttendance.present} Present today`,
      value: data.todayAttendance.present,
    },
    {
      icon: Clock,
      label: `${data.todayAttendance.late} Late`,
      sublabel: `${data.todayAttendance.absent} Absent`,
      value: data.todayAttendance.late + data.todayAttendance.absent,
    },
    {
      icon: ClipboardList,
      label: `${data.pendingApprovals} Awaiting approval`,
      value: data.pendingApprovals,
      pulse: data.pendingApprovals > 0,
    },
    {
      icon: Banknote,
      label: `GHS ${formatGHS(data.monthSalaryLiability)} salary this month`,
      value: data.monthSalaryLiability,
    },
  ];

  return (
    <div className="mb-6 rounded-2xl bg-hgh-navy p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-white">{getGreeting(firstName)}</h2>
        <p className="text-sm text-hgh-muted">{formatDate()}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="relative rounded-2xl border border-hgh-gold/10 bg-white/5 p-5"
            >
              {card.pulse && (
                <span className="absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full bg-hgh-gold" />
              )}
              <Icon size={24} className="mb-2 text-hgh-gold" />
              <p className="text-sm font-medium text-white">{card.label}</p>
              {card.sublabel && (
                <p className="mt-0.5 text-xs text-hgh-muted">{card.sublabel}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
