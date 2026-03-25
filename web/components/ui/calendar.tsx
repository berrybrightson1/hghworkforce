"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * HGH-styled calendar. Relies on `react-day-picker/style.css` + `.hgh-day-picker` overrides in globals.css.
 * Selection styles target `.rdp-selected .rdp-day_button` (v9 puts aria-selected on the cell, not the button).
 */
export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("hgh-day-picker p-3", className)}
      classNames={{
        root: "w-fit font-sans text-hgh-slate",
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "flex w-full flex-col gap-4",
        month_caption: "relative mx-10 flex h-9 items-center justify-center",
        caption_label: "text-sm font-semibold text-hgh-navy",
        nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
        button_previous: cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-hgh-border bg-white text-hgh-navy transition-colors",
          "hover:bg-hgh-offwhite focus:outline-none focus-visible:border-hgh-gold/50 disabled:pointer-events-none disabled:opacity-40",
        ),
        button_next: cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-hgh-border bg-white text-hgh-navy transition-colors",
          "hover:bg-hgh-offwhite focus:outline-none focus-visible:border-hgh-gold/50 disabled:pointer-events-none disabled:opacity-40",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-center text-[11px] font-semibold uppercase tracking-wide text-hgh-muted",
        week: "mt-1 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-10",
        day_button: cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-transparent bg-transparent p-0 font-normal text-hgh-slate transition-colors",
          "hover:bg-hgh-gold/12 hover:text-hgh-navy",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold/50",
        ),
        selected: "",
        today: "",
        outside: cn(
          "[&_button]:!font-normal [&_button]:!text-hgh-muted/45",
          "[&_button]:hover:!bg-hgh-slate/[0.06] [&_button]:hover:!text-hgh-muted/65",
          "[&[data-today]_button]:!text-hgh-gold [&[data-today]_button]:!font-semibold",
        ),
        disabled: "text-hgh-muted/40 [&_button]:cursor-not-allowed [&_button]:opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chClass }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className={cn("h-4 w-4 text-hgh-navy", chClass)} aria-hidden />;
        },
      }}
      {...props}
    />
  );
}
