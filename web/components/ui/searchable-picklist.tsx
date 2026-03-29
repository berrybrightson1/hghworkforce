"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Circle, CircleCheck, Layers } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Searchable list + Enter to commit custom text (for department / job title pickers).
 * Trigger and list row styling align with `Select` / app dropdown spec.
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
        <button
          type="button"
          disabled={disabled}
          id={id}
          aria-invalid={ariaInvalid}
          className={cn(
            "group flex h-10 w-full items-center gap-2 rounded-md border-2 border-hgh-border bg-white px-3 py-2 text-left text-base text-hgh-slate shadow-sm transition-[border-color] duration-150 lg:text-sm",
            "hover:border-hgh-slate/35 focus:outline-none focus-visible:border-hgh-navy",
            open && "border-hgh-navy",
            !value && "text-hgh-muted",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <Layers
            className="h-4 w-4 shrink-0 text-hgh-muted transition-colors group-focus-visible:text-hgh-navy/80"
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate">{value || placeholder}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-hgh-slate transition-transform duration-200",
              open && "-rotate-180",
            )}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="z-[300] w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-lg border-2 border-hgh-border p-0 shadow-lg shadow-hgh-navy/10"
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
            filtered.map((opt) => {
              const selected = opt === value;
              return (
                <li key={opt}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md py-2.5 pl-3 pr-3 text-left text-sm text-hgh-slate outline-none transition-colors hover:bg-hgh-offwhite focus:bg-hgh-offwhite",
                      selected && "bg-hgh-offwhite font-medium text-hgh-navy",
                    )}
                    onClick={() => commitChoice(opt)}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center text-hgh-muted" aria-hidden>
                      {selected ? (
                        <CircleCheck className="h-4 w-4 text-hgh-navy" strokeWidth={2} />
                      ) : (
                        <Circle className="h-4 w-4" strokeWidth={1.5} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{opt}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
