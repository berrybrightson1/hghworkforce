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

  if (!challengeId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
        <p className="text-center text-sm text-slate-400">
          Invalid link. Scan the QR code on the kiosk screen.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-lg font-semibold text-white">HGH WorkForce</h1>

        {status === "loading" && (
          <div className="space-y-3 rounded-xl bg-slate-800 p-8">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            <p className="text-sm text-slate-400">Verifying your device…</p>
          </div>
        )}

        {(status === "success" || status === "first-time") && code && (
          <div className="space-y-4 rounded-xl bg-slate-800 p-8">
            <p className="text-sm text-slate-300">
              Hello, <span className="font-medium text-white">{displayName}</span>
            </p>

            {status === "first-time" && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <p className="text-xs text-emerald-300">
                  This phone is now registered to your account. Only this device can verify your check-ins.
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
                  ringClassName="text-amber-400"
                  trackClassName="text-white/10"
                  labelClassName="text-slate-500"
                />
              ) : null}
              <div className="min-w-0 text-center sm:text-left">
                <p className="text-xs text-slate-400">Your check-in code</p>
                <p className="mt-3 font-mono text-5xl font-bold tracking-[0.25em] text-amber-400">
                  {code}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Enter this on the kiosk before the ring empties — then request a new code at the kiosk.
                </p>
              </div>
            </div>
          </div>
        )}

        {status === "expired" && (
          <div className="space-y-3 rounded-xl bg-slate-800 p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
              <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-amber-300">{errorMsg}</p>
            <p className="text-xs text-slate-500">
              Go back to the kiosk and tap "Generate new code", then scan again.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3 rounded-xl bg-slate-800 p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm text-red-300">{errorMsg}</p>
            {errorHint && (
              <p className="text-xs text-slate-400">{errorHint}</p>
            )}
          </div>
        )}

        <p className="text-[10px] text-slate-600">
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
        <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        </div>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
