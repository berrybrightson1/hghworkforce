import Link from "next/link";
import { Landmark } from "lucide-react";

const footerLinks = [
  { href: "/#services", label: "Services" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#faq", label: "FAQ" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export function LandingFooter() {
  return (
    <footer className="border-t border-hgh-navy-light bg-hgh-navy">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-hgh-gold">
              <Landmark className="text-hgh-navy" size={18} />
            </div>
            <span className="font-medium text-white/80">HGH WorkForce</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-white/40 md:justify-end">
            <span>Payroll + attendance + exports</span>
            <span className="hidden md:inline">·</span>
            <span>Ghana · GRA-aligned</span>
            <span className="hidden md:inline">·</span>
            <span>Secure by HGH Workforce</span>
          </div>
        </div>
        <nav
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm"
          aria-label="Site"
        >
          {footerLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-white/50 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t border-white/5 pt-8 text-center text-sm text-white/30">
          Powered by Hoggar Global Holding. 2026 All rights reserved.
        </div>
      </div>
    </footer>
  );
}
