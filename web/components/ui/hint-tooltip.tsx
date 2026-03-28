"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Short hover hint for actions and chrome. Wraps a single child (e.g. Button).
 * Dashboard shell already wraps the app in TooltipProvider.
 */
export function HintTooltip({
  content,
  children,
  side = "top",
  contentClassName,
}: {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  contentClassName?: string;
}) {
  return (
    <Tooltip delayDuration={280}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={6}
        className={cn(
          "max-w-[min(12.5rem,calc(100vw-2rem))] rounded-md border border-hgh-gold/25 bg-gradient-to-b from-hgh-gold-light/90 to-hgh-gold-light/70 px-2 py-1 text-[11px] font-normal leading-snug text-hgh-slate shadow-sm",
          contentClassName,
        )}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
