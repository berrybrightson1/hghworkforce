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
    <div className="group/briefing relative mb-6 overflow-hidden rounded-2xl border border-hgh-gold/15 bg-gradient-to-br from-hgh-navy via-hgh-navy to-hgh-navy-light shadow-xl shadow-black/25">
      {/* Left gold accent bar */}
      <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-hgh-gold/80 via-hgh-gold/40 to-transparent" />

      {/* Subtle radial glow behind greeting */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-hgh-gold/[0.04] blur-3xl" />

      <div className="grid grid-cols-1 gap-4 p-5 pl-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,2.1fr)] lg:items-center lg:gap-x-8 lg:gap-y-0 lg:p-6 lg:pl-7">
        <div className="flex min-w-0 flex-row items-start justify-between gap-4 border-b border-white/[0.06] pb-4 lg:contents lg:border-0 lg:pb-0">
          <div className="min-w-0 flex-1 lg:min-w-0">
            <p className="text-sm font-normal tracking-wide text-hgh-gold/70 sm:text-base">{getGreeting()},</p>
            <p className="mt-1 w-full max-w-none break-words text-xl font-bold leading-snug text-white sm:text-2xl">
              {nameLine}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm font-normal leading-snug text-white/35">
              <span className="inline-block h-px w-3 bg-hgh-gold/40" />
              {formatDashboardDate(now)}
            </p>
          </div>
          <DashboardFlipClock className="w-max shrink-0 text-right lg:justify-self-center lg:px-1 lg:text-center" />
        </div>

        {/* Vertical divider on desktop */}
        <div className="pointer-events-none absolute inset-y-6 hidden lg:col-start-2 lg:block" style={{ left: "calc(33.33% + 0.5rem)" }}>
          <div className="h-full w-px bg-gradient-to-b from-transparent via-hgh-gold/20 to-transparent" />
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3 lg:gap-3 xl:grid-cols-5">
          {statTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.label}
                className="relative rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-3 transition-all duration-200 hover:border-hgh-gold/20 hover:bg-white/[0.07] hover:shadow-md hover:shadow-hgh-gold/[0.03] sm:px-4 sm:py-4"
              >
                {tile.pulse && (
                  <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-hgh-gold shadow-sm shadow-hgh-gold/50">
                    <span className="absolute inset-0 animate-ping rounded-full bg-hgh-gold/40" />
                  </span>
                )}
                <Icon size={20} strokeWidth={1.6} className={`mb-2 ${tile.accent} opacity-80`} aria-hidden />
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/40 sm:text-[11px]">
                  {tile.label}
                </p>
                <p className="mt-1.5 text-sm font-semibold tabular-nums text-white sm:text-[15px] lg:text-base">
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
