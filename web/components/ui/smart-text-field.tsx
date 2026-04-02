"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SmartTextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Shown in datalist and the examples picker; user can still type anything. */
  suggestions: readonly string[];
  className?: string;
};

/**
 * Text field with browser datalist + a styled “Examples” picker (Radix) that fills the field.
 * Picker resets after each choice so the same suggestion can be applied again.
 */
export function SmartTextField({
  label,
  value,
  onChange,
  placeholder,
  suggestions,
  className,
}: SmartTextFieldProps) {
  const baseId = useId();
  const listId = `${baseId}-dl`;
  const [examplePickerKey, setExamplePickerKey] = useState(0);

  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={`${baseId}-input`} className="block text-xs font-medium text-hgh-slate">
        {label}
      </label>
      <div className="flex min-w-0 gap-2">
        <Input
          id={`${baseId}-input`}
          className="min-w-0 flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          list={listId}
          autoComplete="off"
        />
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {suggestions.length > 0 ? (
          <Select
            key={examplePickerKey}
            onValueChange={(v) => {
              onChange(v);
              setExamplePickerKey((k) => k + 1);
            }}
          >
            <SelectTrigger
              hideLeadingIcon
              aria-label={`${label} — pick an example`}
              className="h-10 w-[min(11rem,32vw)] shrink-0 text-xs"
            >
              <SelectValue placeholder="Examples" />
            </SelectTrigger>
            <SelectContent>
              {suggestions.map((s, i) => (
                <SelectItem key={`${i}-${s}`} value={s} className="text-sm">
                  <span className="line-clamp-2">{s.length > 42 ? `${s.slice(0, 40)}…` : s}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
    </div>
  );
}
