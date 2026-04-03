"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Building2, ChevronDown, Check } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { CompanyProvider, useCompany } from "@/components/company-context";
import { cn } from "@/lib/utils";

function SubscribeHeader({ userRole }: { userRole: UserRole }) {
  const router = useRouter();
  const { companies, selected, select, loading } = useCompany();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const showSwitcher = userRole === "SUPER_ADMIN" && companies.length > 1;

  return (
    <header className="sticky top-0 z-50 border-b border-hgh-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/dashboard");
            }
          }}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-hgh-border bg-white px-3 py-2 text-sm font-medium text-hgh-navy shadow-sm transition-colors hover:bg-hgh-offwhite"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Back
        </button>

        {showSwitcher ? (
          <div ref={ref} className="relative min-w-0 flex-1 sm:flex-initial sm:max-w-xs">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              disabled={loading}
              className="flex w-full min-h-10 items-center justify-between gap-2 rounded-lg border border-hgh-border bg-hgh-offwhite px-3 py-2 text-left text-sm text-hgh-navy transition hover:bg-hgh-border/30"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-hgh-gold" aria-hidden />
                <span className="truncate font-medium">{loading ? "Loading…" : selected?.name ?? "Workspace"}</span>
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-60 transition", open && "rotate-180")} />
            </button>
            {open && (
              <div className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-56 overflow-y-auto rounded-lg border border-hgh-border bg-white py-1 shadow-lg">
                {companies.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      select(c.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-hgh-offwhite",
                      c.id === selected?.id ? "font-medium text-hgh-gold" : "text-hgh-navy",
                    )}
                  >
                    {c.id === selected?.id ? <Check className="h-4 w-4 shrink-0" /> : <span className="w-4" />}
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="min-w-0 flex-1 truncate text-center text-sm font-medium text-hgh-navy sm:flex-initial">
            {loading ? "…" : selected?.name ?? "Workspace"}
          </div>
        )}

        <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-hgh-gold">HGH WorkForce</span>
      </div>
    </header>
  );
}

export function SubscribeShell({
  children,
  userRole,
}: {
  children: React.ReactNode;
  userRole: UserRole;
}) {
  return (
    <CompanyProvider>
      <div className="min-h-dvh bg-hgh-offwhite">
        <SubscribeHeader userRole={userRole} />
        {children}
      </div>
    </CompanyProvider>
  );
}
