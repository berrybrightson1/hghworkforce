"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline informational banner with a dismiss control. Persists to localStorage so it stays hidden.
 */
export function DismissibleCallout({
  storageKey,
  className,
  children,
  onDismiss,
}: {
  storageKey: string;
  className?: string;
  children: React.ReactNode;
  /** Optional; use to hide a parent wrapper (e.g. CardContent) when this callout is dismissed. */
  onDismiss?: () => void;
}) {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(storageKey) === "1") {
        setVisible(false);
      }
    } catch {
      /* private mode / quota */
    }
  }, [storageKey]);

  function dismiss() {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
    onDismiss?.();
  }

  if (!visible) return null;

  return (
    <div className={cn("flex gap-2", className)}>
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        onClick={dismiss}
        className="mt-0.5 shrink-0 rounded-md p-1 text-hgh-muted transition-colors hover:bg-black/[0.04] hover:text-hgh-slate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold/35"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
