"use client";

import { ToastProvider } from "@/components/toast/ToastProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={320} skipDelayDuration={160}>
      <ToastProvider>{children}</ToastProvider>
    </TooltipProvider>
  );
}
