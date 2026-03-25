"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LandingAuth } from "@/lib/landing-auth";

const navLinks = [
  { href: "/#services", label: "Services" },
  { href: "/#features", label: "Features" },
  { href: "/#faq", label: "FAQ" },
] as const;

export function LandingNav({ auth }: { auth: LandingAuth }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <nav className="fixed left-0 right-0 top-0 z-[100] border-b border-hgh-navy-light bg-hgh-navy/95 backdrop-blur-sm">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-3"
          onClick={() => setOpen(false)}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-hgh-gold">
            <Landmark className="text-hgh-navy" size={20} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">HGH WorkForce</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
          <div className="ml-2 flex items-center gap-3">
            {auth.loggedIn ? (
              <Link
                href={auth.appHref}
                className="rounded-lg bg-hgh-gold px-5 py-2 text-sm font-medium text-hgh-navy transition-all hover:bg-hgh-gold/90"
              >
                {auth.label}
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-lg bg-hgh-gold px-5 py-2 text-sm font-medium text-hgh-navy transition-all hover:bg-hgh-gold/90"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold/60 md:hidden"
          aria-expanded={open}
          aria-controls="landing-mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
        </button>
      </div>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 top-16 z-[90] bg-black/50 md:hidden"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <div
            id="landing-mobile-menu"
            className={cn(
              "relative z-[95] border-t border-white/10 bg-hgh-navy shadow-lg md:hidden",
              "animate-in fade-in slide-in-from-top-2 duration-200",
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
          >
            <div className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6">
              {navLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg px-3 py-3 text-base font-medium text-white/90 transition-colors hover:bg-white/5 hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="border-t border-white/10 pt-3">
                {auth.loggedIn ? (
                  <Link
                    href={auth.appHref}
                    className="block rounded-lg bg-hgh-gold px-3 py-3 text-center text-base font-semibold text-hgh-navy hover:bg-hgh-gold/90"
                    onClick={() => setOpen(false)}
                  >
                    {auth.label}
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/sign-in"
                      className="block rounded-lg px-3 py-3 text-base font-medium text-white/80 hover:bg-white/5 hover:text-white"
                      onClick={() => setOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/sign-up"
                      className="mt-2 block rounded-lg bg-hgh-gold px-3 py-3 text-center text-base font-semibold text-hgh-navy hover:bg-hgh-gold/90"
                      onClick={() => setOpen(false)}
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
