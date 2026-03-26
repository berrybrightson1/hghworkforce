"use client";

import { useEffect } from "react";
import Link from "next/link";

/** App Router `error.tsx`: render inside root layout only — no `<html>` / `<body>`. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-hgh-offwhite px-6 text-hgh-navy">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-3 text-sm text-hgh-muted">
          An unexpected error occurred. You can try again or return to the home page.
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
            href="/"
            className="rounded-lg border border-hgh-border bg-white px-5 py-2.5 text-sm font-semibold text-hgh-navy hover:bg-white/90"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
