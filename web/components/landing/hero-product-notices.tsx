"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  FileSpreadsheet,
  MoreVertical,
  Receipt,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROTATE_MS = 4000;

function AvatarWithBadges({
  children,
  variant = "verified",
}: {
  children: React.ReactNode;
  variant?: "verified" | "success";
}) {
  return (
    <div className="relative shrink-0">
      {children}
      {variant === "verified" ? (
        <BadgeCheck
          className="absolute -bottom-0.5 -right-0.5 h-[1.125rem] w-[1.125rem] rounded-full bg-white text-sky-500 ring-2 ring-white"
          strokeWidth={2.25}
          aria-hidden
        />
      ) : (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full bg-white ring-2 ring-white"
          aria-hidden
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-hgh-success" strokeWidth={2.5} />
        </span>
      )}
    </div>
  );
}

const bottomIconMap = {
  spreadsheet: FileSpreadsheet,
  calendar: CalendarClock,
  receipt: Receipt,
  users: Users,
} as const;

/** Shortest copy → back (smallest). Longest headline → front (largest). */
type PersonCompact = {
  initials: string;
  bubbleClass: string;
  name: string;
  /** Keep brief — this card uses the smallest scale */
  subtitle: string;
  badge: "verified" | "success";
};

type PersonLine = {
  initials: string;
  bubbleClass: string;
  line: React.ReactNode;
  meta: string;
  badge: "verified" | "success";
};

type IconFront = {
  icon: keyof typeof bottomIconMap;
  iconWrapClass: string;
  iconClass: string;
  title: string;
  meta: string;
};

type NoticeSet = {
  id: string;
  label: string;
  back: PersonCompact;
  middle: PersonLine;
  front: IconFront;
};

const NOTICE_SETS: NoticeSet[] = [
  {
    id: "payrun",
    label: "Payrun and SSNIT export",
    back: {
      initials: "JM",
      bubbleClass:
        "bg-gradient-to-br from-hgh-gold/40 to-hgh-gold/15 text-xs font-semibold text-hgh-navy ring-2 ring-hgh-gold/25 sm:text-sm",
      name: "Joe Mensah",
      subtitle: "Meridian Logistics",
      badge: "success",
    },
    middle: {
      initials: "BB",
      bubbleClass:
        "bg-gradient-to-br from-violet-200 to-indigo-200 text-xs font-semibold text-indigo-950 ring-2 ring-violet-300/50 sm:text-sm",
      line: (
        <>
          <span className="font-semibold text-hgh-navy">Berry Brightson</span> approved Payrun March 2025
        </>
      ),
      meta: "Finance · 8 min ago",
      badge: "verified",
    },
    front: {
      icon: "spreadsheet",
      iconWrapClass: "rounded-2xl bg-rose-50 ring-1 ring-rose-100",
      iconClass: "text-rose-600",
      title: "SSNIT filing export ready for review",
      meta: "Meridian Logistics · 2 min ago",
    },
  },
  {
    id: "leave",
    label: "Leave requests",
    back: {
      initials: "BB",
      bubbleClass:
        "bg-gradient-to-br from-hgh-gold/40 to-hgh-gold/15 text-xs font-semibold text-hgh-navy ring-2 ring-hgh-gold/25 sm:text-sm",
      name: "Berry Brightson",
      subtitle: "Coastal Foods",
      badge: "success",
    },
    middle: {
      initials: "ED",
      bubbleClass:
        "bg-gradient-to-br from-sky-200 to-blue-200 text-xs font-semibold text-sky-950 ring-2 ring-sky-300/50 sm:text-sm",
      line: (
        <>
          <span className="font-semibold text-hgh-navy">Emma Drizzzy</span> requested annual leave (5 days)
        </>
      ),
      meta: "Self-service · 14 min ago",
      badge: "verified",
    },
    front: {
      icon: "users",
      iconWrapClass: "rounded-2xl bg-slate-100 ring-1 ring-hgh-border",
      iconClass: "text-hgh-navy",
      title: "Leave balances refreshed after public holiday",
      meta: "Coastal Foods · 6 min ago",
    },
  },
  {
    id: "attendance",
    label: "Attendance and shifts",
    back: {
      initials: "ED",
      bubbleClass:
        "bg-gradient-to-br from-hgh-gold/40 to-hgh-gold/15 text-xs font-semibold text-hgh-navy ring-2 ring-hgh-gold/25 sm:text-sm",
      name: "Emma Drizzzy",
      subtitle: "Axis Retail",
      badge: "verified",
    },
    middle: {
      initials: "JM",
      bubbleClass:
        "bg-gradient-to-br from-emerald-200 to-teal-200 text-xs font-semibold text-emerald-950 ring-2 ring-emerald-300/50 sm:text-sm",
      line: (
        <>
          <span className="font-semibold text-hgh-navy">Joe Mensah</span> verified night-shift hours
        </>
      ),
      meta: "Operations · 22 min ago",
      badge: "success",
    },
    front: {
      icon: "calendar",
      iconWrapClass: "rounded-2xl bg-amber-50 ring-1 ring-amber-100",
      iconClass: "text-amber-700",
      title: "Weekly attendance summary ready to export",
      meta: "Axis Retail · 4 min ago",
    },
  },
  {
    id: "payslips",
    label: "Payslips and PAYE",
    back: {
      initials: "BB",
      bubbleClass:
        "bg-gradient-to-br from-hgh-gold/40 to-hgh-gold/15 text-xs font-semibold text-hgh-navy ring-2 ring-hgh-gold/25 sm:text-sm",
      name: "Berry Brightson",
      subtitle: "Sterling Capital",
      badge: "success",
    },
    middle: {
      initials: "JM",
      bubbleClass:
        "bg-gradient-to-br from-indigo-200 to-violet-200 text-xs font-semibold text-violet-950 ring-2 ring-violet-300/50 sm:text-sm",
      line: (
        <>
          <span className="font-semibold text-hgh-navy">Joe Mensah</span> published payslips to the portal
        </>
      ),
      meta: "Payroll · 1 hr ago",
      badge: "verified",
    },
    front: {
      icon: "receipt",
      iconWrapClass: "rounded-2xl bg-violet-50 ring-1 ring-violet-100",
      iconClass: "text-violet-700",
      title: "PAYE remittance worksheet generated",
      meta: "Sterling Capital · Just now",
    },
  },
];

function NoticeStack({ set }: { set: NoticeSet }) {
  const FrontIcon = bottomIconMap[set.front.icon];

  return (
    <ul
      className="flex list-none flex-col items-stretch pb-1 [perspective:800px]"
      aria-label={`Activity preview: ${set.id}`}
    >
      {/* Rear — smallest scale, shortest copy (peek from top) */}
      <li
        className={cn(
          "relative z-10 w-[82%] shrink-0 self-center transition-all duration-500 ease-out motion-reduce:transition-none sm:w-[80%]",
          "origin-bottom scale-[0.78] sm:scale-[0.82]",
          "opacity-[0.92]",
          "group-hover/notices:w-full group-hover/notices:scale-100 group-hover/notices:opacity-100",
          "group-focus-within/notices:w-full group-focus-within/notices:scale-100 group-focus-within/notices:opacity-100",
        )}
      >
        <div className="rounded-2xl border border-hgh-border/70 bg-white p-3.5 shadow-md shadow-hgh-navy/[0.07] sm:p-3.5">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <AvatarWithBadges variant={set.back.badge}>
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10",
                  set.back.bubbleClass,
                )}
              >
                {set.back.initials}
              </div>
            </AvatarWithBadges>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-semibold leading-snug text-hgh-navy">{set.back.name}</p>
              <p className="text-[11px] leading-snug text-hgh-muted sm:text-xs">{set.back.subtitle}</p>
            </div>
          </div>
        </div>
      </li>

      {/* Middle — medium scale, kebab menu */}
      <li
        className={cn(
          "relative z-20 -mt-11 w-[90%] shrink-0 self-center transition-all duration-500 ease-out motion-reduce:transition-none sm:-mt-[3.25rem] sm:w-[91%]",
          "origin-bottom scale-[0.9] sm:scale-[0.93]",
          "group-hover/notices:mt-3 group-hover/notices:w-full group-hover/notices:scale-100 sm:group-hover/notices:mt-4",
          "group-focus-within/notices:mt-3 group-focus-within/notices:w-full group-focus-within/notices:scale-100 sm:group-focus-within/notices:mt-4",
        )}
      >
        <div className="rounded-2xl border border-hgh-border bg-white p-3.5 shadow-lg shadow-hgh-navy/11 sm:p-4">
          <div className="flex items-start gap-3">
            <AvatarWithBadges variant={set.middle.badge}>
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full sm:h-11 sm:w-11",
                  set.middle.bubbleClass,
                )}
              >
                {set.middle.initials}
              </div>
            </AvatarWithBadges>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm leading-snug text-hgh-slate">{set.middle.line}</p>
              <p className="mt-0.5 text-xs text-hgh-muted">{set.middle.meta}</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg p-1.5 text-hgh-muted transition hover:bg-hgh-offwhite hover:text-hgh-navy"
              aria-label="More options"
            >
              <MoreVertical className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </li>

      {/* Front — full width, largest (closest to viewer) */}
      <li
        className={cn(
          "relative z-30 -mt-11 w-full shrink-0 self-center transition-all duration-500 ease-out motion-reduce:transition-none sm:-mt-[3.25rem]",
          "origin-bottom scale-100",
          "group-hover/notices:mt-3 sm:group-hover/notices:mt-4",
          "group-focus-within/notices:mt-3 sm:group-focus-within/notices:mt-4",
        )}
      >
        <div className="rounded-2xl border border-hgh-border/90 bg-white p-4 shadow-xl shadow-hgh-navy/16 sm:p-[1.125rem]">
          <div className="flex items-start gap-3">
            <div
              className={cn("flex h-11 w-11 shrink-0 items-center justify-center", set.front.iconWrapClass)}
              aria-hidden
            >
              <FrontIcon className={cn("h-5 w-5", set.front.iconClass)} strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-semibold leading-snug text-hgh-navy">{set.front.title}</p>
              <p className="mt-1 text-xs text-hgh-muted">{set.front.meta}</p>
            </div>
          </div>
        </div>
      </li>
    </ul>
  );
}

export function HeroProductNotices() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % NOTICE_SETS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, reduceMotion]);

  return (
    <div
      className={cn(
        "group/notices relative mx-auto mt-6 w-full max-w-[420px] transition-[min-height] duration-500 ease-out motion-reduce:transition-none",
        "min-h-[13.75rem] sm:min-h-[14.25rem]",
        "group-hover/notices:min-h-[21rem] sm:group-hover/notices:min-h-[22rem]",
        "group-focus-within/notices:min-h-[21rem] sm:group-focus-within/notices:min-h-[22rem]",
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="sr-only">
        Activity previews rotate every few seconds. Hover to pause rotation and expand the stacked cards.
      </span>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {NOTICE_SETS[active].label}
      </span>
      <div
        className="pointer-events-none absolute bottom-6 left-1/2 z-0 h-40 w-[108%] max-w-xl -translate-x-1/2 rounded-[3.5rem] bg-gradient-to-tr from-hgh-gold/25 via-sky-100/80 to-indigo-100/70 opacity-90 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10">
        {NOTICE_SETS.map((set, i) => (
          <div
            key={set.id}
            {...(i === active ? {} : { "aria-hidden": true })}
            className={cn(
              "transition-opacity duration-700 ease-in-out motion-reduce:transition-none",
              i === active
                ? "relative opacity-100"
                : "pointer-events-none absolute inset-x-0 top-0 opacity-0",
            )}
          >
            <NoticeStack set={set} />
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-center gap-1.5" role="group" aria-label="Choose activity preview">
        {NOTICE_SETS.map((set, i) => (
          <button
            key={set.id}
            type="button"
            aria-current={i === active ? "true" : undefined}
            aria-label={`${set.label} (preview ${i + 1} of ${NOTICE_SETS.length})`}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === active ? "w-5 bg-hgh-gold" : "w-1.5 bg-hgh-border hover:bg-hgh-muted/50",
            )}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </div>
  );
}
