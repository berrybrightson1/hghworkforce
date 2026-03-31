"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthenticatorCountdown } from "@/components/kiosk/authenticator-countdown";

function VerifyInner() {
  const searchParams = useSearchParams();
  const challengeId = searchParams.get("c") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "first-time" | "error" | "expired">("loading");
  const [code, setCode] = useState<string | null>(null);
  const [expiresAtIso, setExpiresAtIso] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [errorHint, setErrorHint] = useState("");

  const handleCodeExpired = useCallback(() => {
    setStatus("expired");
    setErrorMsg("This code has expired.");
    setCode(null);
    setExpiresAtIso(null);
  }, []);

  useEffect(() => {
    if (!challengeId) {
      setStatus("error");
      setErrorMsg("Invalid link — no challenge ID found.");
      return;
    }

    void (async () => {
      try {
        const res = await fetch("/api/kiosk/device-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeId }),
          credentials: "include",
        });

        const data = (await res.json().catch(() => ({}))) as {
          code?: string;
          displayName?: string;
          message?: string;
          firstTime?: boolean;
          expiresAt?: string;
          error?: string;
          hint?: string;
        };

        if (res.ok) {
          setCode(data.code ?? null);
          setDisplayName(data.displayName ?? "");
          setExpiresAtIso(data.expiresAt ?? null);
          setStatus(data.firstTime ? "first-time" : "success");
        } else if (res.status === 410) {
          setStatus("expired");
          setErrorMsg(data.error ?? "Challenge expired");
          setExpiresAtIso(null);
        } else {
          setStatus("error");
          setErrorMsg(data.error ?? "Verification failed");
          setErrorHint(data.hint ?? "");
        }
      } catch {
        setStatus("error");
        setErrorMsg("Network error — check your connection and try again.");
      }
    })();
  }, [challengeId]);

  const panelClass = "space-y-4 rounded-xl border border-hgh-border bg-white p-6 shadow-sm";

  if (!challengeId) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-hgh-offwhite p-6">
        <div className={panelClass}>
          <p className="text-center text-sm text-hgh-muted">Invalid link. Scan the QR code on the kiosk screen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-hgh-offwhite p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-base font-semibold text-hgh-navy">HGH WorkForce</h1>
        <p className="text-xs text-hgh-muted">Device verification</p>

        {status === "loading" && (
          <div className={panelClass}>
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-hgh-gold border-t-transparent" />
            <p className="text-sm text-hgh-muted">Verifying your device…</p>
          </div>
        )}

        {(status === "success" || status === "first-time") && code && (
          <div className={panelClass}>
            <p className="text-sm text-hgh-slate">
              Hello, <span className="font-semibold text-hgh-navy">{displayName}</span>
            </p>

            {status === "first-time" && (
              <div className="rounded-lg border border-hgh-success/30 bg-hgh-success/10 px-3 py-2 text-left">
                <p className="text-xs text-hgh-navy">
                  This phone is now registered to your account. Only this device can verify your
                  check-ins.
                </p>
              </div>
            )}

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center sm:gap-8">
              {expiresAtIso ? (
                <AuthenticatorCountdown
                  expiresAtIso={expiresAtIso}
                  onExpired={handleCodeExpired}
                  size={72}
                  strokeWidth={4}
                  ringClassName="text-hgh-gold"
                  trackClassName="text-hgh-border"
                  labelClassName="text-hgh-muted"
                />
              ) : null}
              <div className="min-w-0 text-center sm:text-left">
                <p className="text-xs font-medium text-hgh-muted">Your check-in code</p>
                <p className="mt-3 font-mono text-5xl font-bold tracking-[0.25em] text-hgh-gold">
                  {code}
                </p>
                <p className="mt-2 text-xs text-hgh-muted">
                  Enter this on the kiosk before the ring empties — then request a new code at the kiosk.
                </p>
              </div>
            </div>
          </div>
        )}

        {status === "expired" && (
          <div className={panelClass}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-hgh-gold/15">
              <svg className="h-6 w-6 text-hgh-gold" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-hgh-navy">{errorMsg}</p>
            <p className="text-xs text-hgh-muted">
              Go back to the kiosk and tap &quot;Generate new code&quot;, then scan again.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className={panelClass}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-hgh-danger/15">
              <svg className="h-6 w-6 text-hgh-danger" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm text-hgh-danger">{errorMsg}</p>
            {errorHint ? <p className="text-xs text-hgh-muted">{errorHint}</p> : null}
          </div>
        )}

        <p className="text-[10px] text-hgh-muted">
          {new Date().toLocaleDateString("en-GH", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          {" · "}
          {new Date().toLocaleTimeString("en-GH", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

export default function KioskVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-hgh-offwhite p-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-hgh-gold border-t-transparent" />
        </div>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
