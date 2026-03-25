"use client";

import * as React from "react";
import { format, startOfToday } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseIsoDate(value: string): Date | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function DatePickerField({
  value,
  onChange,
  onBlur,
  id,
  disabled,
  placeholder = "Select date",
  displayFormat = "dd/MM/yyyy",
  className,
  triggerClassName,
  allowClear = true,
  "aria-invalid": ariaInvalid,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  /** date-fns format string for the trigger label (value stays yyyy-MM-dd). */
  displayFormat?: string;
  className?: string;
  /** Added to the trigger button (width constraints, e.g. max-w-[11rem]). */
  triggerClassName?: string;
  /** When false, hides Clear in the popover footer. */
  allowClear?: boolean;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = parseIsoDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          onBlur={onBlur}
          aria-invalid={ariaInvalid}
          className={cn(
            "flex h-10 w-full min-w-[10.5rem] items-center justify-between gap-2 rounded-lg border border-hgh-border bg-white px-3 py-2 text-left text-base shadow-sm transition-colors lg:text-sm",
            "hover:border-hgh-gold/35 focus:outline-none focus-visible:border-hgh-navy/40 focus-visible:ring-2 focus-visible:ring-hgh-gold/25",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-hgh-muted",
            selected && "text-hgh-slate",
            ariaInvalid && "border-hgh-danger focus-visible:ring-hgh-danger/30",
            className,
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <CalendarIcon className="h-4 w-4 shrink-0 text-hgh-gold" aria-hidden />
            <span className="truncate">
              {selected ? format(selected, displayFormat) : placeholder}
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto overflow-hidden border border-hgh-border p-0 shadow-xl shadow-hgh-navy/10 ring-1 ring-hgh-gold/20"
        align="start"
      >
        <div className="border-b border-hgh-gold/25 bg-gradient-to-b from-hgh-offwhite to-white">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected ?? startOfToday()}
            onSelect={(d) => {
              onChange(d ? format(d, "yyyy-MM-dd") : "");
              setOpen(false);
            }}
          />
        </div>
        <div className="flex gap-2 border-t border-hgh-border bg-hgh-offwhite px-2.5 py-2.5">
          {allowClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="h-9 flex-1 rounded-lg border border-hgh-border bg-white text-sm font-semibold text-hgh-navy hover:border-hgh-gold/40 hover:bg-hgh-gold/10 hover:text-hgh-navy"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            className={cn(
              "h-9 text-sm font-semibold shadow-sm ring-1 ring-hgh-gold/30",
              allowClear ? "flex-1" : "w-full",
            )}
            onClick={() => {
              onChange(format(startOfToday(), "yyyy-MM-dd"));
              setOpen(false);
            }}
          >
            Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
