"use client";

import {
  SettingsPreviewProvider,
  useSettingsNavHoverClear,
} from "./settings-preview-context";
import { SettingsSubNav } from "./settings-sub-nav";

function SettingsNavAndContent({ children }: { children: React.ReactNode }) {
  const { scheduleClear } = useSettingsNavHoverClear();
  return (
    <div
      className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-0"
      onMouseLeave={(e) => {
        const next = e.relatedTarget;
        if (next instanceof Node && e.currentTarget.contains(next)) return;
        scheduleClear();
      }}
    >
      <SettingsSubNav />
      <div className="min-w-0 flex-1 lg:pl-8">{children}</div>
    </div>
  );
}

export function SettingsLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <SettingsPreviewProvider>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-1 sm:px-5 md:px-8">
        <header className="border-b border-zinc-200/80 pb-8 pt-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
            Configure payroll, taxes, office kiosk / attendance policy, and integrations. PAYE and SSNIT apply to pay
            runs; kiosk hours and timezone control punch rules; the employee portal Attendance page is read-only plus
            correction requests (no clock-in/out there).
          </p>
        </header>

        <SettingsNavAndContent>{children}</SettingsNavAndContent>
      </div>
    </SettingsPreviewProvider>
  );
}
