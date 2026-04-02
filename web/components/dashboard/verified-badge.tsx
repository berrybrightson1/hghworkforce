"use client";

import { ShieldCheck } from "lucide-react";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { icon: 12, badge: "gap-0.5 px-1.5 py-0.5 text-[10px]" },
  md: { icon: 14, badge: "gap-1 px-2 py-0.5 text-xs" },
} as const;

/**
 * Verified subscriber badge — gold shield shown for workspaces with an active subscription.
 *
 * Pass `subscriptionStatus` from the company context; renders nothing if not "ACTIVE".
 */
export function VerifiedBadge({
  subscriptionStatus,
  size = "sm",
  showLabel = false,
  className,
}: {
  subscriptionStatus?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}) {
  if (subscriptionStatus !== "ACTIVE") return null;

  const s = sizes[size];

  const badge = (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full font-semibold",
        "bg-hgh-gold/15 text-hgh-gold",
        s.badge,
        className,
      )}
    >
      <ShieldCheck size={s.icon} className="shrink-0" />
      {showLabel && "Verified"}
    </span>
  );

  return (
    <HintTooltip
      content="This workspace has an active subscription — full product access."
      side="bottom"
      contentClassName="max-w-[16rem]"
    >
      {badge}
    </HintTooltip>
  );
}

/**
 * Compact icon-only variant for tight spaces (company switcher rows, header).
 */
export function VerifiedIcon({
  subscriptionStatus,
  className,
}: {
  subscriptionStatus?: string;
  className?: string;
}) {
  if (subscriptionStatus !== "ACTIVE") return null;

  return (
    <HintTooltip
      content="Verified subscriber"
      side="bottom"
      contentClassName="max-w-[10rem]"
    >
      <ShieldCheck
        size={14}
        className={cn("shrink-0 text-hgh-gold", className)}
      />
    </HintTooltip>
  );
}

/**
 * Header chrome: same 9×9 footprint and radius as the notification bell, gold-toned.
 */
export function VerifiedHeaderBadge({
  subscriptionStatus,
}: {
  subscriptionStatus?: string;
}) {
  if (subscriptionStatus !== "ACTIVE") return null;

  return (
    <HintTooltip
      content="This workspace has an active subscription — full product access."
      side="bottom"
      contentClassName="max-w-[16rem]"
    >
      <span
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-hgh-gold/40",
          "bg-hgh-gold/10 text-hgh-gold shadow-sm transition-colors hover:bg-hgh-gold/16",
          "outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold/40",
        )}
        tabIndex={0}
        aria-label="Verified subscriber workspace"
      >
        <ShieldCheck size={18} className="shrink-0" strokeWidth={2.25} />
      </span>
    </HintTooltip>
  );
}
