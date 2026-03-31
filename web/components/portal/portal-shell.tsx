"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  CalendarDays,
  FileText,
  Timer,
  Home,
  Landmark,
  LogOut,
  Loader2,
  User,
  Bell,
  FolderOpen,
  Clock,
  ClipboardList,
  UserCircle,
  Wallet,
  Megaphone,
  MessageSquare,
  HelpCircle,
  FileEdit,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/toast/useToast";
import { createClient } from "@/lib/supabase/client";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";
import { HintTooltip } from "@/components/ui/hint-tooltip";

type PortalNotificationRow = {
  id: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

/** Matches main column width so header aligns with page content */
const PORTAL_CONTENT = "mx-auto w-full max-w-5xl px-4 md:px-6" as const;

/** Navy header icon buttons: no gold focus ring (avoid double “halo” on dark bar); soft bg on focus only */
const PORTAL_HEADER_ICON_BTN =
  "ring-0 ring-offset-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus-visible:bg-white/15 data-[state=open]:ring-0 data-[state=open]:ring-offset-0" as const;

const nav: {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  hint: string;
}[] = [
  { href: "/portal", label: "Home", icon: Home, exact: true, hint: "Overview: notices, leave status, and quick shortcuts." },
  { href: "/portal/profile", label: "Profile", icon: UserCircle, hint: "Your HR record, sensitive fields, and portal PIN changes." },
  {
    href: "/portal/checkin",
    label: "Attendance",
    icon: Timer,
    hint: "Today's punches from the office kiosk. Request fixes here—clock in/out only on the kiosk, not in the browser.",
  },
  { href: "/portal/schedule", label: "Schedule", icon: Clock, hint: "Shift times you've been assigned." },
  { href: "/portal/payslips", label: "Payslips", icon: FileText, hint: "Download PDF payslips for past pay periods." },
  { href: "/portal/earnings", label: "Earnings (YTD)", icon: Wallet, hint: "Year-to-date totals from approved payroll." },
  { href: "/portal/documents", label: "Documents", icon: FolderOpen, hint: "Files your employer shared with you." },
  { href: "/portal/notices", label: "Notices", icon: Megaphone, hint: "Company announcements and must-read posts." },
  { href: "/portal/feedback", label: "Feedback", icon: MessageSquare, hint: "Send feedback or suggestions to HR." },
  { href: "/portal/pay-queries", label: "Pay queries", icon: HelpCircle, hint: "Ask questions about payslips or deductions." },
  { href: "/portal/profile-requests", label: "Profile requests", icon: FileEdit, hint: "Propose changes to your details for HR to approve." },
  { href: "/portal/leave", label: "Leave", icon: CalendarDays, hint: "Request time off and track balances." },
  { href: "/portal/loans", label: "Loans", icon: Landmark, hint: "Salary advances and repayment progress." },
  {
    href: "/portal/corrections",
    label: "Corrections",
    icon: ClipboardList,
    hint: "Status of attendance correction requests you submitted from Attendance.",
  },
];

export function PortalShell({
  children,
  userEmail,
  userDisplayName,
  authMode = "supabase",
  employeeCode = "",
  department = "",
}: {
  children: React.ReactNode;
  userEmail: string;
  userDisplayName: string;
  authMode?: "supabase" | "portal";
  employeeCode?: string;
  department?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { selected, loading: companyLoading } = useCompany();
  const [billingReady, setBillingReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { data: notifications, mutate: mutateNotifications } = useApi<PortalNotificationRow[]>(
    "/api/me/portal-notifications",
  );

  useEffect(() => {
    if (companyLoading || !selected?.id) return;
    let cancelled = false;
    setBillingReady(false);
    void (async () => {
      try {
        const res = await fetch(`/api/billing/summary?companyId=${encodeURIComponent(selected.id)}`);
        const data = (await res.json()) as { locked?: boolean };
        if (cancelled) return;
        setLocked(Boolean(data.locked));
      } catch {
        if (!cancelled) setLocked(false);
      } finally {
        if (!cancelled) setBillingReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyLoading, selected?.id]);

  useLayoutEffect(() => {
    if (!billingReady || companyLoading) return;
    const onSubPage = pathname === "/portal/subscription-required";
    if (locked && !onSubPage) {
      router.replace("/portal/subscription-required");
    } else if (!locked && onSubPage) {
      router.replace("/portal");
    }
  }, [billingReady, companyLoading, locked, pathname, router]);

  useEffect(() => {
    if (typeof window === "undefined" || !billingReady || !locked || !selected?.id) return;
    if (pathname !== "/portal/subscription-required") return;
    const k = `hgh-portal-trial-ended-toast-${selected.id}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
    toast.error(
      "This workspace's free trial has ended. Ask your admin to subscribe in Dashboard → Billing to restore access.",
    );
  }, [billingReady, locked, pathname, selected?.id, toast]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  async function markNotificationsRead(ids: string[]) {
    if (ids.length === 0) return;
    try {
      await fetch("/api/me/portal-notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, read: true }),
      });
      await mutateNotifications();
    } catch {
      /* ignore */
    }
  }

  async function handleSignOut() {
    if (authMode === "portal") {
      try {
        await fetch("/api/portal/auth/logout", { method: "POST" });
      } catch {
        /* ignore */
      }
      toast.info("Signed out");
      router.push("/portal/login");
      router.refresh();
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.info("Signed out successfully");
    router.push("/sign-in");
    router.refresh();
  }

  const onSubscriptionPage = pathname === "/portal/subscription-required";
  const routingToLock = billingReady && locked && !onSubscriptionPage;
  const routingFromLock = billingReady && !locked && onSubscriptionPage;

  if (companyLoading || !billingReady || routingToLock || routingFromLock) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] flex-col items-center justify-center gap-3 bg-hgh-offwhite text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-hgh-navy" aria-hidden />
        <p className="text-sm">Loading portal…</p>
      </div>
    );
  }

  const sidebarNav = (
    <nav className="flex flex-col gap-0.5 p-2 md:p-3" aria-label="Portal navigation">
      {nav.map((item) => {
        const Icon = item.icon;
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <HintTooltip
            key={item.href}
            content={item.hint}
            side="right"
            contentClassName="max-w-[min(18rem,calc(100vw-2.5rem))]"
          >
            <Link
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-hgh-gold/15 font-medium text-hgh-navy shadow-sm ring-1 ring-hgh-gold/25"
                  : "text-hgh-muted hover:bg-hgh-offwhite hover:text-hgh-navy",
              )}
            >
              <Icon
                size={18}
                className={cn(
                  "shrink-0 transition-colors",
                  active ? "text-hgh-gold" : "text-hgh-muted group-hover:text-hgh-gold",
                )}
                aria-hidden
              />
              <span className="min-w-0 leading-snug">{item.label}</span>
            </Link>
          </HintTooltip>
        );
      })}
    </nav>
  );

  const codeDeptLine =
    [employeeCode?.trim(), department?.trim()].filter((s) => s && s.length > 0).join(" · ") || null;

  const headerBar = (
    <header className="w-full shrink-0 border-b border-hgh-border bg-hgh-navy text-white">
      <div className={cn(PORTAL_CONTENT, "py-3")}>
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <HintTooltip
              content="Open the side menu (all portal pages)."
              side="bottom"
              contentClassName="max-w-[14rem]"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 w-9 shrink-0 p-0 text-white/85 hover:bg-white/10 md:hidden",
                  PORTAL_HEADER_ICON_BTN,
                )}
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu size={20} aria-hidden />
              </Button>
            </HintTooltip>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hgh-gold">
              <User className="h-5 w-5 text-hgh-navy" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-hgh-gold">
                Employee portal
              </p>
              <p className="truncate text-sm font-medium leading-tight text-white/90">{userDisplayName}</p>
              {userEmail ? (
                <p className="mt-0.5 truncate text-[11px] text-white/45 sm:text-xs" title={userEmail}>
                  {userEmail}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            {codeDeptLine ? (
              <HintTooltip
                content="Your payroll employee code and department on file (helps at the kiosk and with HR)."
                side="bottom"
                contentClassName="max-w-[16rem]"
              >
                <span
                  className="max-w-[11rem] cursor-help truncate border-r border-white/20 pr-3 text-right text-[11px] text-white/70 tabular-nums sm:max-w-md sm:pr-4 sm:text-sm"
                  title={codeDeptLine}
                >
                  {codeDeptLine}
                </span>
              </HintTooltip>
            ) : null}
            <DropdownMenu>
              <HintTooltip
                content="Alerts from payroll, leave, notices, and more. Click an item to open it."
                side="bottom"
                contentClassName="max-w-[15rem]"
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "relative h-9 w-9 shrink-0 p-0 text-white/80 hover:bg-white/10 hover:text-white",
                      PORTAL_HEADER_ICON_BTN,
                      "data-[state=open]:bg-white/10",
                    )}
                    aria-label="Notifications"
                  >
                    <Bell size={18} aria-hidden />
                    {unreadCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-hgh-gold px-1 text-[10px] font-bold text-hgh-navy">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    ) : null}
                  </Button>
                </DropdownMenuTrigger>
              </HintTooltip>
              <DropdownMenuContent align="end" className="max-h-[min(24rem,70vh)] overflow-y-auto">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications && notifications.length > 0 ? (
                  <>
                    {notifications.slice(0, 20).map((n) => (
                      <DropdownMenuItem
                        key={n.id}
                        className="flex flex-col items-start gap-1 py-2"
                        onClick={() => {
                          void markNotificationsRead([n.id]);
                          if (n.linkUrl?.startsWith("http")) {
                            window.open(n.linkUrl, "_blank", "noopener,noreferrer");
                          } else if (n.linkUrl) {
                            router.push(n.linkUrl);
                          }
                        }}
                      >
                        <span className={`font-medium ${n.isRead ? "text-white/70" : "text-white"}`}>
                          {n.title}
                        </span>
                        <span className="text-xs text-white/55 line-clamp-2">{n.message}</span>
                        <span className="text-[10px] text-white/40">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </DropdownMenuItem>
                    ))}
                    {unreadCount > 0 ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="justify-center text-hgh-gold"
                          onClick={() => void markNotificationsRead(notifications.filter((x) => !x.isRead).map((x) => x.id))}
                        >
                          Mark all read
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </>
                ) : (
                  <DropdownMenuItem disabled className="text-white/50">
                    No notifications yet
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <HintTooltip content="Sign out of the employee portal on this device." side="bottom" contentClassName="max-w-[14rem]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className={cn(
                  "shrink-0 text-white/80 hover:bg-white/10 hover:text-white",
                  PORTAL_HEADER_ICON_BTN,
                )}
              >
                <LogOut size={16} aria-hidden />
                <span className="ml-1 hidden sm:inline">Sign out</span>
                <span className="sr-only sm:hidden">Sign out</span>
              </Button>
            </HintTooltip>
          </div>
        </div>
      </div>
    </header>
  );

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-hgh-offwhite">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      {headerBar}

      <div className={cn(PORTAL_CONTENT, "flex min-h-0 flex-1 items-start gap-4 py-6 md:gap-5 md:py-8")}>
        <aside
          className={cn(
            "flex flex-col overflow-hidden rounded-r-2xl border border-hgh-border bg-white text-hgh-navy shadow-lg shadow-hgh-navy/5 transition-transform duration-200 ease-out md:rounded-xl md:shadow-sm",
            /* Mobile: floating drawer from the left, below header */
            "fixed left-0 top-[3.75rem] z-50 max-h-[calc(100dvh-4.5rem)] w-[min(17.5rem,88vw)] -translate-x-full md:static md:top-auto md:z-0 md:max-h-[calc(100dvh-7rem)]",
            mobileNavOpen && "translate-x-0",
            /* Desktop: card beside main, sticky while scrolling */
            "md:sticky md:top-6 md:w-56 md:shrink-0 md:translate-x-0",
          )}
        >
          <div className="flex items-center justify-between border-b border-hgh-border px-3 py-3 md:hidden">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-hgh-muted">Navigation</p>
            <HintTooltip content="Close the menu" side="right" contentClassName="max-w-[12rem]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 shrink-0 p-0 text-hgh-navy hover:bg-hgh-offwhite"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
              >
                <X size={20} aria-hidden />
              </Button>
            </HintTooltip>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            {sidebarNav}
          </div>
        </aside>

        <main className="min-h-0 min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
