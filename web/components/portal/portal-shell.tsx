"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  FileText,
  Fingerprint,
  Home,
  Landmark,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/useToast";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { href: "/portal", label: "Home", icon: Home, exact: true },
  { href: "/portal/checkin", label: "Check-in", icon: Fingerprint },
  { href: "/portal/payslips", label: "Payslips", icon: FileText },
  { href: "/portal/leave", label: "Leave", icon: CalendarDays },
  { href: "/portal/loans", label: "Loans", icon: Landmark },
];

export function PortalShell({
  children,
  userEmail,
  userDisplayName,
}: {
  children: React.ReactNode;
  userEmail: string;
  userDisplayName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.info("Signed out successfully");
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-hgh-offwhite">
      <header className="shrink-0 border-b border-hgh-border bg-hgh-navy text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 md:px-6">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 max-w-[min(100%,calc(100%-7rem))] items-center gap-3 sm:max-w-none">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hgh-gold">
                <User className="h-5 w-5 text-hgh-navy" strokeWidth={2} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-hgh-gold">
                  Employee portal
                </p>
                <p className="truncate text-sm font-medium text-white/90">{userDisplayName}</p>
                <p className="truncate text-xs text-white/45 sm:hidden" title={userEmail}>
                  {userEmail}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden max-w-[200px] truncate text-xs text-white/50 md:inline" title={userEmail}>
                {userEmail}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="shrink-0 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <LogOut size={16} aria-hidden />
                <span className="ml-1 hidden sm:inline">Sign out</span>
                <span className="sr-only sm:hidden">Sign out</span>
              </Button>
            </div>
          </div>
          <nav
            className="-mx-4 flex gap-1 overflow-x-auto overscroll-x-contain px-4 pb-0.5 [-webkit-overflow-scrolling:touch] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
            aria-label="Portal navigation"
          >
            {nav.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
                    active ? "bg-white/10 text-hgh-gold" : "text-white/75 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon size={16} className="shrink-0" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  );
}
