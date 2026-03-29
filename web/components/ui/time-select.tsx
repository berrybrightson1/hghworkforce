"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME_EMPTY_VALUE = "__hgh_time_empty__";

function buildTimeOptions(stepMinutes: number): string[] {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += stepMinutes) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return out;
}

function mergeOption(list: string[], value: string | undefined): string[] {
  if (value && TIME_RE.test(value) && !list.includes(value)) {
    return [...list, value].sort();
  }
  return list;
}

/**
 * Branded HH:mm selector (30‑minute steps by default). Avoids native `type="time"`.
 */
export function TimeSelect({
  value,
  onChange,
  id,
  disabled,
  placeholder = "Select time",
  className,
  stepMinutes = 30,
  allowEmpty = false,
  emptyLabel = "Not set",
  "aria-invalid": ariaInvalid,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  stepMinutes?: 15 | 30;
  /** When true, first option clears the value (`""`). */
  allowEmpty?: boolean;
  emptyLabel?: string;
  "aria-invalid"?: boolean;
}) {
  const options = useMemo(() => {
    const base = buildTimeOptions(stepMinutes);
    return mergeOption(base, value);
  }, [stepMinutes, value]);

  const selectValue = TIME_RE.test(value) ? value : allowEmpty ? TIME_EMPTY_VALUE : "";

  return (
    <Select
      value={selectValue || undefined}
      onValueChange={(v) => {
        if (allowEmpty && v === TIME_EMPTY_VALUE) {
          onChange("");
          return;
        }
        onChange(v);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-invalid={ariaInvalid}
        className={cn("w-full", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[min(60vh,320px)]">
        {allowEmpty && (
          <SelectItem value={TIME_EMPTY_VALUE} className="text-hgh-muted">
            {emptyLabel}
          </SelectItem>
        )}
        {options.map((t) => (
          <SelectItem key={t} value={t}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
