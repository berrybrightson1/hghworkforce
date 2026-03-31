"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logServerError } from "@/lib/server-log";

export default function DashboardErrorGroup({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logServerError("dashboard/error-boundary", error, { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-hgh-navy">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-3 text-sm text-hgh-muted">
          The dashboard hit an unexpected error. You can try again or return to the overview.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-hgh-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-hgh-navy-light"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-hgh-border bg-white px-5 py-2.5 text-sm font-semibold text-hgh-navy hover:bg-white/90"
          >
            Dashboard home
          </Link>
        </div>
      </div>
    </div>
  );
}
