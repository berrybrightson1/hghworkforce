"use client";

import { useEffect, useState } from "react";
import { Users, Clock, UserX, ClipboardList, Banknote } from "lucide-react";
import { DashboardFlipClock } from "@/components/dashboard/dashboard-flip-clock";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";

type BriefingData = {
  todayAttendance: { present: number; late: number; absent: number };
  pendingApprovals: number;
  monthSalaryLiability: number;
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** e.g. Thursday, 2 April 2026 */
function formatDashboardDate(d: Date): string {
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  const day = d.getDate();
  const month = d.toLocaleDateString("en-GB", { month: "long" });
  const year = d.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

function formatGHS(amount: number): string {
  return amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MorningBriefing({
  greetingName,
}: {
  /** Title-cased first and last name (or best available). */
  greetingName: string;
}) {
  const { selected } = useCompany();
  const { data } = useApi<BriefingData>(
    selected ? `/api/dashboard/briefing?companyId=${selected.id}` : null,
  );
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!data) return null;

  const nameLine = greetingName.trim() || "there";

  const statTiles = [
    {
      icon: Users,
      label: "Present today",
      value: String(data.todayAttendance.present),
      accent: "text-emerald-200",
    },
    {
      icon: Clock,
      label: "Late",
      value: String(data.todayAttendance.late),
      accent: "text-amber-200",
    },
    {
      icon: UserX,
      label: "Absent",
      value: String(data.todayAttendance.absent),
      accent: "text-rose-200",
    },
    {
      icon: ClipboardList,
      label: "Awaiting approval",
      value: String(data.pendingApprovals),
      accent: data.pendingApprovals > 0 ? "text-hgh-gold" : "text-white/80",
      pulse: data.pendingApprovals > 0,
    },
    {
      icon: Banknote,
      label: "Salary this month",
      value: `GHS ${formatGHS(data.monthSalaryLiability)}`,
      accent: "text-white",
    },
  ];

  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-hgh-navy shadow-lg shadow-hgh-navy/20">
      {/* One flip clock in the DOM: mobile = flex row with greeting; lg = `contents` lifts children into 3-col grid */}
      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,2.1fr)] lg:items-center lg:gap-x-6 lg:gap-y-0 lg:p-6">
        <div className="flex min-w-0 flex-row items-start justify-between gap-4 border-b border-white/10 pb-4 lg:contents lg:border-0 lg:pb-0">
          <div className="min-w-0 flex-1 lg:min-w-0">
            <p className="text-base font-medium leading-tight text-white/85 sm:text-lg">{getGreeting()},</p>
            <p className="mt-1 w-full max-w-none break-words text-xl font-bold leading-snug text-white sm:text-2xl">
              {nameLine}
            </p>
            <p className="mt-2 text-sm font-normal leading-snug text-white/40">{formatDashboardDate(now)}</p>
          </div>
          <DashboardFlipClock className="w-max shrink-0 text-right lg:justify-self-center lg:px-1 lg:text-center" />
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3 lg:gap-3 xl:grid-cols-5">
          {statTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.label}
                className="relative rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-4"
              >
                {tile.pulse && (
                  <span className="absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full bg-hgh-gold" />
                )}
                <Icon size={22} className={`mb-1.5 sm:mb-2 ${tile.accent}`} aria-hidden />
                <p className="text-[11px] font-medium leading-tight text-white/55 sm:text-xs">
                  {tile.label}
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-white sm:text-[15px] lg:text-base">
                  {tile.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
