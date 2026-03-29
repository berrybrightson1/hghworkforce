"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown, Circle, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { GHANA_BANK_NAMES, branchesForBank, filterOptions } from "@/lib/ghana-banks";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type BankFieldProps = {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

/** Type or pick from major Ghana banks. */
export function GhanaBankField({
  id,
  value,
  onChange,
  disabled,
  placeholder = "Bank name (type or pick)",
}: BankFieldProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const list = useMemo(() => {
    const banks = [...GHANA_BANK_NAMES];
    return filterOptions(banks, filter || value, 45);
  }, [filter, value]);

  return (
    <div className="flex gap-2">
      <input
        id={id}
        disabled={disabled}
        className={cn(
          "h-10 min-w-0 flex-1 rounded-md border border-hgh-border bg-white px-3 text-sm text-hgh-slate shadow-sm",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-hgh-border bg-white text-hgh-muted shadow-sm hover:bg-hgh-offwhite focus:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold disabled:opacity-50"
            aria-label="Browse Ghana banks"
          >
            <ChevronsUpDown className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="min-w-[320px] overflow-hidden rounded-lg border-2 border-hgh-border p-0 shadow-lg shadow-hgh-navy/10"
          align="end"
          sideOffset={6}
        >
          <div className="border-b border-hgh-border p-2">
            <input
              aria-label="Filter banks"
              className="h-9 w-full rounded-md border border-hgh-border px-2 text-sm focus:outline-none focus-visible:border-hgh-navy focus-visible:ring-0"
              placeholder="Filter banks…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="max-h-[260px] overflow-y-auto scroll-hgh p-1">
            {list.map((b) => {
              const selected = b === value;
              return (
                <button
                  key={b}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md py-2.5 pl-2 pr-3 text-left text-sm text-hgh-slate transition-colors hover:bg-hgh-offwhite focus:bg-hgh-offwhite focus:outline-none",
                    selected && "bg-hgh-offwhite font-medium text-hgh-navy",
                  )}
                  onClick={() => {
                    onChange(b);
                    setOpen(false);
                    setFilter("");
                  }}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center text-hgh-muted" aria-hidden>
                    {selected ? (
                      <CircleCheck className="h-4 w-4 text-hgh-navy" strokeWidth={2} />
                    ) : (
                      <Circle className="h-4 w-4" strokeWidth={1.5} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">{b}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

type BranchFieldProps = {
  id?: string;
  bankName: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function GhanaBranchField({
  id,
  bankName,
  value,
  onChange,
  disabled,
  placeholder = "Branch (type or pick suggestion)",
}: BranchFieldProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const branches = useMemo(() => branchesForBank(bankName), [bankName]);
  const list = useMemo(() => filterOptions(branches, filter || value, 70), [branches, filter, value]);

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <input
          id={id}
          disabled={disabled}
          className={cn(
            "h-10 min-w-0 flex-1 rounded-md border border-hgh-border bg-white px-3 text-sm text-hgh-slate shadow-sm",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
        />
        <Popover open={open && Boolean(bankName.trim())} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled || !bankName.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-hgh-border bg-white text-hgh-muted shadow-sm hover:bg-hgh-offwhite focus:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold disabled:opacity-50"
              aria-label="Browse branch suggestions"
            >
              <ChevronsUpDown className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="min-w-[300px] overflow-hidden rounded-lg border-2 border-hgh-border p-0 shadow-lg shadow-hgh-navy/10"
            align="end"
            sideOffset={6}
          >
            <div className="border-b border-hgh-border p-2">
              <input
                aria-label="Filter branches"
                className="h-9 w-full rounded-md border border-hgh-border px-2 text-sm focus:outline-none focus-visible:border-hgh-navy focus-visible:ring-0"
                placeholder="Filter branches…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <div className="max-h-[220px] overflow-y-auto scroll-hgh p-1">
              {list.length === 0 ? (
                <p className="px-2 py-2 text-xs text-hgh-muted">No suggestions — type your branch.</p>
              ) : (
                list.map((b) => {
                  const selected = b === value;
                  return (
                    <button
                      key={b}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md py-2.5 pl-2 pr-3 text-left text-sm text-hgh-slate transition-colors hover:bg-hgh-offwhite focus:bg-hgh-offwhite focus:outline-none",
                        selected && "bg-hgh-offwhite font-medium text-hgh-navy",
                      )}
                      onClick={() => {
                        onChange(b);
                        setOpen(false);
                        setFilter("");
                      }}
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-hgh-muted" aria-hidden>
                        {selected ? (
                          <CircleCheck className="h-4 w-4 text-hgh-navy" strokeWidth={2} />
                        ) : (
                          <Circle className="h-4 w-4" strokeWidth={1.5} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">{b}</span>
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-xs text-hgh-muted">
        {bankName.trim()
          ? `Suggestions for ${bankName}. You can enter any branch name.`
          : "Pick a bank first for richer branch suggestions."}
      </p>
    </div>
  );
}
