"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import type { PlanModule } from "@/lib/planPermissions";

export function FeatureGate({
  module,
  children,
  fallback,
}: {
  module: PlanModule;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { canAccess } = usePlan();
  if (canAccess(module)) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <div className="rounded-xl border border-hgh-border bg-white p-5">
      <div className="flex items-start gap-3">
        <Lock size={22} className="text-hgh-gold" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-hgh-navy">This feature is not included in your current plan.</p>
          <Link
            href="/subscribe"
            className="mt-3 inline-flex items-center rounded-md border border-hgh-gold/40 bg-hgh-gold/10 px-3 py-1.5 text-xs font-medium text-hgh-navy hover:bg-hgh-gold/20"
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    </div>
  );
}
