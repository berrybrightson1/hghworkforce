"use client";

import Link from "next/link";
import { ShieldOff } from "lucide-react";

export default function CheckinDeniedPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-hgh-danger/10 text-hgh-danger">
        <ShieldOff className="h-8 w-8" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold text-hgh-navy">Check-in unavailable</h1>
      <p className="mt-3 text-sm leading-relaxed text-hgh-muted">
        Check-in is restricted to your company&apos;s registered work PC (or to IPs your admin has
        approved). You are not connecting from that network. Use the designated office machine, or ask
        an administrator to clear and re-register the work PC IP in Settings if your office network
        changed.
      </p>
      <Link
        href="/portal"
        className="mt-8 text-sm font-medium text-hgh-gold underline-offset-4 hover:underline"
      >
        Back to portal
      </Link>
    </div>
  );
}
