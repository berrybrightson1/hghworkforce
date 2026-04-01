"use client";

import { useEffect, useState } from "react";
import { Users, Clock, UserX, ClipboardList, Banknote } from "lucide-react";
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

function formatLiveTime(d: Date): string {
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
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
    const id = window.setInterval(() => setNow(new Date()), 1000);
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
      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[minmax(0,0.95fr)_auto_minmax(0,2.1fr)] lg:items-center lg:gap-0 lg:p-6">
        {/* 1 — Left: greeting & date (compact) */}
        <div className="flex min-w-0 flex-col justify-center border-b border-white/10 pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
          <p className="w-full max-w-none break-words text-base font-semibold leading-snug text-white sm:text-lg">
            {getGreeting()}, {nameLine}
          </p>
          <p className="mt-1.5 text-xs text-white/55">{formatDate()}</p>
        </div>

        {/* 2 — Center: live clock (compact) */}
        <div className="flex shrink-0 flex-col items-center justify-center border-b border-white/10 pb-4 text-center lg:w-max lg:min-w-[7.5rem] lg:border-b-0 lg:border-r lg:pb-0 lg:px-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
            Local time
          </span>
          <time
            dateTime={now.toISOString()}
            className="mt-0.5 font-mono text-lg font-semibold tabular-nums tracking-tight text-white sm:text-xl"
          >
            {formatLiveTime(now)}
          </time>
        </div>

        {/* 3 — Right: stats (dominant width) */}
        <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3 lg:gap-3 lg:pl-4 xl:grid-cols-5">
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
