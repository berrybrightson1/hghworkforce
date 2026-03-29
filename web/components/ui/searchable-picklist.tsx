"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Searchable list + Enter to commit custom text (for department / job title pickers).
 */
export function SearchablePicklist({
  value,
  onChange,
  options,
  placeholder = "Search or pick…",
  disabled,
  id,
  "aria-invalid": ariaInvalid,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return options;
    return options.filter((o) => o.toLowerCase().includes(qq));
  }, [options, q]);

  function commitChoice(next: string) {
    const t = next.trim();
    if (!t) return;
    onChange(t);
    setOpen(false);
    setQ("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQ("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          id={id}
          aria-invalid={ariaInvalid}
          className={cn(
            "h-10 w-full justify-between border border-hgh-border bg-white px-3 font-normal text-hgh-navy hover:bg-hgh-offwhite",
            !value && "text-hgh-muted",
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[300] w-[min(calc(100vw-2rem),22rem)] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b border-hgh-border p-2">
          <Input
            placeholder="Type to filter…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const t = q.trim();
              if (filtered.length === 1) {
                commitChoice(filtered[0]);
                return;
              }
              if (t) commitChoice(t);
            }}
            className="h-9"
            autoComplete="off"
          />
          <p className="mt-1 text-[10px] text-hgh-muted">
            Enter applies a custom value; click a row to pick a suggestion.
          </p>
        </div>
        <ul className="max-h-60 overflow-y-auto overscroll-contain p-1" role="listbox">
          {filtered.length === 0 ? (
            <li className="px-2 py-3 text-xs text-hgh-muted">No matches — press Enter to use what you typed.</li>
          ) : (
            filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  role="option"
                  aria-selected={opt === value}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-hgh-navy hover:bg-hgh-offwhite",
                    opt === value && "bg-hgh-gold/10",
                  )}
                  onClick={() => commitChoice(opt)}
                >
                  {opt === value ? <Check className="h-4 w-4 shrink-0 text-hgh-gold" aria-hidden /> : <span className="w-4 shrink-0" />}
                  <span className="min-w-0 truncate">{opt}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
