"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DueDayPresetSelectProps = {
  presets: readonly number[];
  onPick: (days: number) => void;
  placeholder?: string;
  "aria-label"?: string;
};

export function DueDayPresetSelect({
  presets,
  onPick,
  placeholder = "Presets",
  "aria-label": ariaLabel = "Preset days",
}: DueDayPresetSelectProps) {
  const [resetKey, setResetKey] = useState(0);
  return (
    <Select
      key={resetKey}
      onValueChange={(v) => {
        onPick(parseInt(v, 10));
        setResetKey((k) => k + 1);
      }}
    >
      <SelectTrigger hideLeadingIcon aria-label={ariaLabel} className="h-10 w-[7.25rem] shrink-0 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {presets.map((d) => (
          <SelectItem key={d} value={String(d)} className="text-sm">
            {d} days
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
