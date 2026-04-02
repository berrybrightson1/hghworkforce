"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, ChevronsUpDown, BookOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CopyIconButton } from "@/components/ui/copy-button";
import { useToast } from "@/components/toast/useToast";
import { useApi } from "@/lib/swr";
import { createClient } from "@/lib/supabase/client";

interface SidebarAccountMenuProps {
  email: string;
  displayName: string;
}

const appPublicBase =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

function getInitials(name: string, email: string): string {
  const src = name && name !== "User" ? name : email;
  const parts = src.trim().split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return src.slice(0, 2).toUpperCase();
}

function MenuIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={`shrink-0 ${className ?? "text-hgh-muted"}`}>{children}</span>;
}

export function SidebarAccountMenu({ email, displayName }: SidebarAccountMenuProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: me } = useApi<{ referralCode?: string | null }>("/api/me");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const initials = getInitials(displayName, email);
  const code = me?.referralCode?.trim() ?? "";
  const referralInviteUrl =
    code && appPublicBase ? `${appPublicBase}/sign-up?ref=${encodeURIComponent(code)}` : "";

  async function handleSignOut() {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.info("Signed out successfully");
      router.push("/sign-in");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  }

  return (
    <>
      {/* Padding on wrapper — not margin on w-full button — avoids width + margin overflow past the sidebar */}
      <div className="w-full min-w-0 shrink-0 px-2 pb-2 pt-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full min-w-0 max-w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left outline-none transition-colors hover:bg-white/5 focus:ring-0 focus-visible:ring-2 focus-visible:ring-hgh-gold/40"
            >
              <div className="relative shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-hgh-gold bg-hgh-navy text-sm font-bold text-hgh-gold">
                  {initials}
                </div>
                <span
                  className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-hgh-navy bg-hgh-success"
                  title="Signed in"
                  aria-hidden
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{displayName}</p>
                <p className="truncate text-xs text-white/45">{email}</p>
              </div>

              <ChevronsUpDown size={16} className="shrink-0 text-white/45" aria-hidden />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="min-w-0 w-[var(--radix-dropdown-menu-trigger-width)] max-w-[var(--radix-dropdown-menu-trigger-width)]"
          >
            <DropdownMenuLabel className="truncate" title={email}>
              {email}
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <div className="px-2 py-2">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">
                Referral invite
              </p>
              <p tabIndex={0} className="mt-1 px-1 text-[11px] leading-snug text-white/55">
                Share your sign-up link so another organisation can attach your code.
              </p>
              {referralInviteUrl ? (
                <div className="mt-2 flex min-w-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5">
                  <a
                    href={referralInviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={referralInviteUrl}
                    className="min-w-0 flex-1 truncate text-left text-xs font-mono font-medium text-hgh-gold underline-offset-2 hover:underline"
                  >
                    {referralInviteUrl}
                  </a>
                  <CopyIconButton
                    text={referralInviteUrl}
                    label="Copy invite link"
                    hint="Copies your referral sign-up URL to share."
                    className="shrink-0 text-white/65 hover:bg-white/10 hover:text-white"
                  />
                </div>
              ) : (
                <p className="mt-2 px-1 text-xs text-white/45">
                  {me === undefined ? "Loading…" : "No referral code yet — try refreshing."}
                </p>
              )}
            </div>

            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => router.push("/dashboard/help")}>
                <MenuIcon>
                  <BookOpen size={18} />
                </MenuIcon>
                Help &amp; guide
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem destructive onSelect={() => setShowLogoutConfirm(true)}>
              <MenuIcon className="text-hgh-danger"><LogOut size={18} /></MenuIcon>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title="Confirm Logout">
        <div className="space-y-4 pt-2">
          <p className="text-sm text-hgh-muted leading-relaxed">
            Are you sure you want to log out? Any unsaved changes may be lost.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button 
              variant="ghost" 
              onClick={() => setShowLogoutConfirm(false)}
              disabled={isLoggingOut}
            >
              Stay Logged In
            </Button>
            <Button 
              variant="danger" 
              onClick={handleSignOut}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Signing out..." : "Yes, Log Out"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

