"use client";

import { useEffect, useLayoutEffect, useState } from "react";

function parseExpiresAt(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

type Props = {
  /** Server challenge expiry (ISO 8601). */
  expiresAtIso: string;
  /** Called once when countdown reaches zero. */
  onExpired?: () => void;
  /** Ring and label colors (tailwind-friendly classes). */
  className?: string;
  ringClassName?: string;
  trackClassName?: string;
  labelClassName?: string;
  /** Show numeric seconds under the ring. */
  showSecondsLabel?: boolean;
  size?: number;
  strokeWidth?: number;
};

/**
 * Circular countdown similar to Google Authenticator: ring depletes as the code window runs out.
 */
export function AuthenticatorCountdown({
  expiresAtIso,
  onExpired,
  className = "",
  ringClassName = "text-amber-400",
  trackClassName = "text-white/10",
  labelClassName = "text-slate-500",
  showSecondsLabel = true,
  size = 56,
  strokeWidth = 3,
}: Props) {
  const expiresAtMs = parseExpiresAt(expiresAtIso);
  /** Fixed denominator for this challenge (remaining ms when this expiry first applied). */
  const [basisMs, setBasisMs] = useState<number | null>(null);
  const [, tick] = useState(0);
  const [expiredSent, setExpiredSent] = useState(false);

  useLayoutEffect(() => {
    setExpiredSent(false);
    const exp = parseExpiresAt(expiresAtIso);
    setBasisMs(exp > 0 ? Math.max(1, exp - Date.now()) : 1);
  }, [expiresAtIso]);

  useEffect(() => {
    if (!expiresAtMs) return;

    const id = window.setInterval(() => {
      tick((n) => n + 1);
    }, 250);

    return () => window.clearInterval(id);
  }, [expiresAtIso, expiresAtMs]);

  const remainingMs = Math.max(0, expiresAtMs - Date.now());
  const remainingSec = Math.ceil(remainingMs / 1000);

  const denom = basisMs ?? 1;
  const progress = Math.min(1, Math.max(0, remainingMs / denom));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  useEffect(() => {
    if (remainingMs <= 0 && expiresAtMs > 0 && !expiredSent) {
      setExpiredSent(true);
      onExpired?.();
    }
  }, [remainingMs, expiresAtMs, expiredSent, onExpired]);

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className="relative" style={{ width: size, height: size }} aria-hidden>
        <svg width={size} height={size} className="-rotate-90 transform">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className={trackClassName}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`transition-[stroke-dashoffset] duration-200 ${ringClassName}`}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums text-white"
          aria-live="polite"
        >
          {remainingSec}
        </span>
      </div>
      {showSecondsLabel && (
        <p className={`text-[10px] font-medium uppercase tracking-wide ${labelClassName}`}>
          {remainingSec === 1 ? "1 second left" : `${remainingSec} seconds left`}
        </p>
      )}
    </div>
  );
}
