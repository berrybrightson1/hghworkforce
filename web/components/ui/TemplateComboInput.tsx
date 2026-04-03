"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TemplateComboInput({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  const normalized = useMemo(() => options.map((o) => o.trim()).filter(Boolean), [options]);

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-hgh-slate">{label}</label>
      <Select
        value=""
        onValueChange={(picked) => {
          onChange(picked);
        }}
      >
        <SelectTrigger hideLeadingIcon className="w-full">
          <SelectValue placeholder="Choose a suggested template" />
        </SelectTrigger>
        <SelectContent>
          {normalized.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Type your own template name"}
      />
    </div>
  );
}
