"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
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
        <PopoverContent className="min-w-[320px] p-0" align="end">
          <div className="border-b border-hgh-border p-2">
            <input
              aria-label="Filter banks"
              className="h-9 w-full rounded-md border border-hgh-border px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold"
              placeholder="Filter banks…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="max-h-[260px] overflow-y-auto scroll-hgh p-1">
            {list.map((b) => (
              <button
                key={b}
                type="button"
                className={cn(
                  "flex w-full rounded-md px-2 py-2 text-left text-sm hover:bg-hgh-offwhite",
                  b === value && "bg-hgh-gold/10 font-medium text-hgh-navy",
                )}
                onClick={() => {
                  onChange(b);
                  setOpen(false);
                  setFilter("");
                }}
              >
                {b}
              </button>
            ))}
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
          <PopoverContent className="min-w-[300px] p-0" align="end">
            <div className="border-b border-hgh-border p-2">
              <input
                aria-label="Filter branches"
                className="h-9 w-full rounded-md border border-hgh-border px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold"
                placeholder="Filter branches…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <div className="max-h-[220px] overflow-y-auto scroll-hgh p-1">
              {list.length === 0 ? (
                <p className="px-2 py-2 text-xs text-hgh-muted">No suggestions — type your branch.</p>
              ) : (
                list.map((b) => (
                  <button
                    key={b}
                    type="button"
                    className={cn(
                      "flex w-full rounded-md px-2 py-2 text-left text-sm hover:bg-hgh-offwhite",
                      b === value && "bg-hgh-gold/10 font-medium text-hgh-navy",
                    )}
                    onClick={() => {
                      onChange(b);
                      setOpen(false);
                      setFilter("");
                    }}
                  >
                    {b}
                  </button>
                ))
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
