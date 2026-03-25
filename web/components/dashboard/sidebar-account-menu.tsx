"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Settings, HelpCircle, LogOut, ChevronsUpDown } from "lucide-react";
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
import { useToast } from "@/components/toast/useToast";
import { createClient } from "@/lib/supabase/client";

interface SidebarAccountMenuProps {
  email: string;
  displayName: string;
}

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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const initials = getInitials(displayName, email);

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 border-t border-white/10 px-4 py-3 text-left transition-colors hover:bg-white/5 focus-visible:outline-none"
          >
            {/* Avatar */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hgh-gold bg-hgh-navy text-sm font-bold text-hgh-gold">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
            </div>

            {/* Toggle icon */}
            <ChevronsUpDown size={16} className="shrink-0 text-hgh-muted" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-[240px] min-w-0">
          {/* Header */}
          <DropdownMenuLabel>{email}</DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => router.push("/dashboard/settings")}>
              <MenuIcon><Settings size={18} /></MenuIcon>
              Settings
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={() => router.push("/dashboard/help")}>
              <MenuIcon><HelpCircle size={18} /></MenuIcon>
              Help & Guide
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem destructive onSelect={() => setShowLogoutConfirm(true)}>
            <MenuIcon className="text-hgh-danger"><LogOut size={18} /></MenuIcon>
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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

