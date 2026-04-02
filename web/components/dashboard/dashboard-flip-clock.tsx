"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function FlipDigit({ digit }: { digit: string }) {
  return (
    <div
      className={cn(
        "relative flex h-12 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/25 bg-black/55 shadow-md tabular-nums ring-1 ring-white/15 sm:h-14 sm:w-10",
      )}
    >
      <span
        key={digit}
        className={cn(
          "flex h-full w-full items-center justify-center font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl",
          "animate-flip-digit motion-reduce:animate-none",
        )}
      >
        {digit}
      </span>
    </div>
  );
}

function FlipPair({ value }: { value: number }) {
  const v = Math.min(99, Math.max(0, Math.floor(value)));
  const str = String(v).padStart(2, "0");
  return (
    <div className="flex gap-px">
      <FlipDigit digit={str[0]!} />
      <FlipDigit digit={str[1]!} />
    </div>
  );
}

function TimeColon() {
  return (
    <span
      className="mb-2 select-none px-1.5 font-mono text-3xl font-semibold leading-none text-white/60 sm:text-4xl sm:mb-2.5"
      aria-hidden
    >
      :
    </span>
  );
}

/** Live 12-hour flip clock (HH : MM : SS + am/pm) for the morning briefing header. */
export function DashboardFlipClock({ className }: { className?: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const h24 = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const h12 = h24 % 12 || 12;
  const ampm = h24 < 12 ? "am" : "pm";

  return (
    <div className={cn("relative isolate z-10", className)}>
      <div
        className="flex flex-wrap items-end justify-end gap-x-0 gap-y-1 lg:justify-center"
        aria-hidden
      >
        <FlipPair value={h12} />
        <TimeColon />
        <FlipPair value={minutes} />
        <TimeColon />
        <FlipPair value={seconds} />
        <span className="mb-2 ml-2 font-mono text-xl font-bold lowercase tabular-nums text-white sm:mb-2.5 sm:ml-3 sm:text-2xl">
          {ampm}
        </span>
      </div>
      <span className="sr-only">Current time {now.toLocaleTimeString(undefined, { timeStyle: "short" })}</span>
    </div>
  );
}
