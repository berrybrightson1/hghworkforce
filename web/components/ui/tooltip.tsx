"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 10, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[250] max-w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-hgh-border bg-white text-hgh-slate shadow-xl outline-none",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/** Each sidebar nav hint can pick a distinct card theme (dark gradient + matching text). */
export type SidebarNavHintPalette =
  | "brand"
  | "teal"
  | "indigo"
  | "violet"
  | "rose"
  | "amber"
  | "emerald"
  | "sky"
  | "fuchsia"
  | "cyan"
  | "orange"
  | "slate"
  | "blue"
  | "pink"
  | "red"
  | "lime"
  | "warm"
  | "cool"
  | "deep";

/** High-contrast description text on all dark gradient cards (avoids muddy *-50/90 on *-950). */
const SIDEBAR_HINT_BODY = "text-white/[0.94]";

const SIDEBAR_HINT_PALETTES: Record<
  SidebarNavHintPalette,
  { surface: string; title: string; body: string; footer: string; link: string }
> = {
  brand: {
    surface:
      "border-hgh-gold/35 bg-gradient-to-b from-hgh-navy-light via-hgh-navy-light to-hgh-navy shadow-2xl shadow-black/40",
    title: "text-hgh-gold",
    body: SIDEBAR_HINT_BODY,
    footer: "border-white/12",
    link: "text-hgh-gold-light hover:text-hgh-gold",
  },
  teal: {
    surface:
      "border-teal-400/35 bg-gradient-to-br from-teal-800 via-teal-900 to-teal-950 shadow-2xl shadow-teal-950/45",
    title: "text-teal-200",
    body: SIDEBAR_HINT_BODY,
    footer: "border-teal-200/15",
    link: "text-teal-100 hover:text-white",
  },
  indigo: {
    surface:
      "border-indigo-400/35 bg-gradient-to-br from-indigo-800 via-indigo-900 to-indigo-950 shadow-2xl shadow-indigo-950/45",
    title: "text-indigo-200",
    body: SIDEBAR_HINT_BODY,
    footer: "border-indigo-200/15",
    link: "text-indigo-100 hover:text-white",
  },
  violet: {
    surface:
      "border-violet-400/35 bg-gradient-to-br from-violet-800 via-violet-900 to-violet-950 shadow-2xl shadow-violet-950/45",
    title: "text-violet-200",
    body: SIDEBAR_HINT_BODY,
    footer: "border-violet-200/15",
    link: "text-violet-100 hover:text-white",
  },
  rose: {
    surface:
      "border-rose-400/35 bg-gradient-to-br from-rose-800 via-rose-900 to-rose-950 shadow-2xl shadow-rose-950/45",
    title: "text-rose-200",
    body: SIDEBAR_HINT_BODY,
    footer: "border-rose-200/15",
    link: "text-rose-100 hover:text-white",
  },
  amber: {
    surface:
      "border-amber-400/40 bg-gradient-to-br from-amber-900 via-amber-950 to-stone-900 shadow-2xl shadow-amber-950/40",
    title: "text-amber-200",
    body: SIDEBAR_HINT_BODY,
    footer: "border-amber-200/18",
    link: "text-amber-100 hover:text-white",
  },
  emerald: {
    surface:
      "border-emerald-400/35 bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950 shadow-2xl shadow-emerald-950/45",
    title: "text-emerald-200",
    body: SIDEBAR_HINT_BODY,
    footer: "border-emerald-200/15",
    link: "text-emerald-100 hover:text-white",
  },
  sky: {
    surface:
      "border-sky-400/35 bg-gradient-to-br from-sky-800 via-sky-900 to-sky-950 shadow-2xl shadow-sky-950/45",
    title: "text-sky-200",
    body: SIDEBAR_HINT_BODY,
    footer: "border-sky-200/15",
    link: "text-sky-100 hover:text-white",
  },
  fuchsia: {
    surface:
      "border-fuchsia-400/35 bg-gradient-to-br from-fuchsia-800 via-fuchsia-900 to-fuchsia-950 shadow-2xl shadow-fuchsia-950/45",
    title: "text-fuchsia-200",
    body: SIDEBAR_HINT_BODY,
    footer: "border-fuchsia-200/15",
    link: "text-fuchsia-100 hover:text-white",
  },
  cyan: {
    surface:
      "border-cyan-400/35 bg-gradient-to-br from-cyan-800 via-cyan-900 to-cyan-950 shadow-2xl shadow-cyan-950/45",
    title: "text-cyan-200",
    body: SIDEBAR_HINT_BODY,
    footer: "border-cyan-200/15",
    link: "text-cyan-100 hover:text-white",
  },
  orange: {
    surface:
      "border-orange-400/35 bg-gradient-to-br from-orange-800 via-orange-900 to-orange-950 shadow-2xl shadow-orange-950/45",
    title: "text-orange-200",
    body: SIDEBAR_HINT_BODY,
    footer: "border-orange-200/15",
    link: "text-orange-100 hover:text-white",
  },
  slate: {
    surface:
      "border-slate-400/30 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 shadow-2xl shadow-slate-950/50",
    title: "text-slate-100",
    body: SIDEBAR_HINT_BODY,
    footer: "border-slate-300/20",
    link: "text-slate-100 hover:text-white",
  },
  blue: {
    surface:
      "border-blue-400/35 bg-gradient-to-br from-blue-800 via-blue-900 to-blue-950 shadow-2xl shadow-blue-950/45",
    title: "text-blue-200",
    body: SIDEBAR_HINT_BODY,
    footer: "border-blue-200/15",
    link: "text-blue-100 hover:text-white",
  },
  pink: {
    surface:
      "border-pink-400/35 bg-gradient-to-br from-pink-800 via-pink-900 to-pink-950 shadow-2xl shadow-pink-950/45",
    title: "text-pink-200",
    body: SIDEBAR_HINT_BODY,
    footer: "border-pink-200/15",
    link: "text-pink-100 hover:text-white",
  },
  red: {
    surface:
      "border-red-400/35 bg-gradient-to-br from-red-900 via-red-950 to-stone-950 shadow-2xl shadow-red-950/45",
    title: "text-red-200",
    body: SIDEBAR_HINT_BODY,
    footer: "border-red-200/15",
    link: "text-red-100 hover:text-white",
  },
  lime: {
    surface:
      "border-lime-400/35 bg-gradient-to-br from-lime-900 via-lime-950 to-stone-900 shadow-2xl shadow-lime-950/35",
    title: "text-lime-200",
    body: SIDEBAR_HINT_BODY,
    footer: "border-lime-200/15",
    link: "text-lime-100 hover:text-white",
  },
  warm: {
    surface:
      "border-amber-500/25 bg-gradient-to-br from-stone-800 via-amber-950 to-stone-950 shadow-2xl shadow-stone-950/50",
    title: "text-amber-100",
    body: SIDEBAR_HINT_BODY,
    footer: "border-stone-400/15",
    link: "text-amber-200 hover:text-amber-50",
  },
  cool: {
    surface:
      "border-cyan-500/25 bg-gradient-to-br from-slate-800 via-cyan-950 to-slate-950 shadow-2xl shadow-slate-950/50",
    title: "text-cyan-200",
    body: SIDEBAR_HINT_BODY,
    footer: "border-cyan-200/12",
    link: "text-cyan-100 hover:text-white",
  },
  deep: {
    surface:
      "border-purple-500/30 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-950 shadow-2xl shadow-purple-950/40",
    title: "text-purple-200",
    body: SIDEBAR_HINT_BODY,
    footer: "border-purple-300/15",
    link: "text-purple-100 hover:text-white",
  },
};

export function sidebarNavTooltipSurfaceClassForPalette(
  palette?: SidebarNavHintPalette,
): string {
  const p = palette && SIDEBAR_HINT_PALETTES[palette] ? palette : "brand";
  // Override TooltipContent default `text-hgh-slate` so inherited text is never dark on these cards.
  return cn("border text-white", SIDEBAR_HINT_PALETTES[p].surface);
}

export type SidebarNavHint = {
  /** Short line shown in bold (defaults to nav label). */
  title?: string;
  /** Plain-language what this area is for, before the user navigates. */
  body: string;
  /** Optional link into Help & guide (opens in same tab). */
  learnHref?: string;
  /** Card colors; each nav hint should use a different palette for variety. */
  palette?: SidebarNavHintPalette;
};

export function SidebarNavHintContent({
  navLabel,
  hint,
  tone = "sidebar",
}: {
  navLabel: string;
  hint: SidebarNavHint;
  /** `sidebar` = dark gradient cards. `light` = white card for reuse elsewhere. */
  tone?: "sidebar" | "light";
}) {
  if (tone === "light") {
    return (
      <div className="flex flex-col">
        <div className="p-3.5 pt-3">
          <p className="text-sm font-semibold leading-snug text-hgh-navy">{hint.title ?? navLabel}</p>
          <p className="mt-2 text-sm leading-relaxed text-hgh-muted">{hint.body}</p>
        </div>
        {hint.learnHref ? (
          <div className="border-t border-hgh-border px-3.5 py-2.5 text-right">
            <Link
              href={hint.learnHref}
              className="text-sm font-medium text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline"
            >
              Learn more in Help
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  const palKey: SidebarNavHintPalette =
    hint.palette && SIDEBAR_HINT_PALETTES[hint.palette] ? hint.palette : "brand";
  const pal = SIDEBAR_HINT_PALETTES[palKey];

  return (
    <div className="flex flex-col">
      <div className="p-3.5 pt-3">
        <p className={cn("text-sm font-semibold leading-snug", pal.title)}>{hint.title ?? navLabel}</p>
        <p className={cn("mt-2 text-sm leading-relaxed", pal.body)}>{hint.body}</p>
      </div>
      {hint.learnHref ? (
        <div className={cn("border-t px-3.5 py-2.5 text-right", pal.footer)}>
          <Link
            href={hint.learnHref}
            className={cn(
              "text-sm font-medium underline-offset-2 hover:underline",
              pal.link,
            )}
          >
            Learn more in Help
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent };
