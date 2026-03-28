"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeKioskCompanyId } from "@/lib/kiosk-company-id";

type Step = "identify" | "scan-qr" | "enter-code" | "done";

function KioskInner() {
  const searchParams = useSearchParams();
  const companyId = normalizeKioskCompanyId(
    searchParams.get("c") ?? searchParams.get("companyId"),
  );

  const [step, setStep] = useState<Step>("identify");
  const [employeeCode, setEmployeeCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [clockedIn, setClockedIn] = useState(false);
  const [label, setLabel] = useState("");
  const [companyTitle, setCompanyTitle] = useState<string | null>(null);
  const [clockInHint, setClockInHint] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [deviceVerified, setDeviceVerified] = useState(false);
  const [expired, setExpired] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch company status on mount
  useEffect(() => {
    if (!companyId) return;
    void (async () => {
      try {
        const res = await fetch(
          `/api/kiosk/status?companyId=${encodeURIComponent(companyId)}`,
        );
        const data = (await res.json().catch(() => ({}))) as {
          companyName?: string;
          clockInAllowed?: boolean;
          clockInBlockedReason?: string | null;
          error?: string;
          hint?: string;
        };
        if (!res.ok) {
          const msg =
            data.hint ||
            data.error ||
            (res.status === 404
              ? "Company not found for this link — check ?c= matches your database."
              : "Could not load kiosk");
          setLinkError(msg);
          return;
        }
        setLinkError(null);
        if (typeof data.companyName === "string") setCompanyTitle(data.companyName);
        if (data.clockInAllowed === false && data.clockInBlockedReason) {
          setClockInHint(data.clockInBlockedReason);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [companyId]);

  // Poll challenge status when on scan-qr step
  useEffect(() => {
    if (step !== "scan-qr" || !challengeId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/kiosk/challenge?id=${encodeURIComponent(challengeId)}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          deviceVerified: boolean;
          consumed: boolean;
          expired: boolean;
        };
        if (data.expired) {
          setExpired(true);
          if (pollRef.current) clearInterval(pollRef.current);
          return;
        }
        if (data.deviceVerified) {
          setDeviceVerified(true);
          setStep("enter-code");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        /* ignore */
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, challengeId]);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const getQrUrl = useCallback(() => {
    if (!challengeId) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/kiosk/verify?c=${encodeURIComponent(challengeId)}`;
  }, [challengeId]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/kiosk/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          employeeCode: employeeCode.trim(),
          displayName: displayName.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        challengeId?: string;
        clockedIn?: boolean;
        displayLabel?: string;
      };
      if (!res.ok) {
        const msg = [data.error, data.hint].filter(Boolean).join(" ").trim();
        setError(msg || "Verify failed");
        return;
      }
      setError(null);
      setChallengeId(data.challengeId!);
      setClockedIn(Boolean(data.clockedIn));
      setLabel(String(data.displayLabel || ""));
      setDeviceVerified(false);
      setExpired(false);
      setCodeInput("");
      setStep("scan-qr");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeId || !codeInput.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const action = clockedIn ? "clock-out" : "clock-in";
      const res = await fetch("/api/kiosk/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code: codeInput.trim(), action }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        _meta?: { lateMinutes?: number | null; overtimeHours?: number | null; shiftName?: string | null };
      };
      if (!res.ok) {
        throw new Error([data.error, data.hint].filter(Boolean).join(" ") || "Request failed");
      }

      const meta = data._meta;
      let msg = action === "clock-in" ? "Clocked in successfully!" : "Clocked out successfully!";
      if (meta?.lateMinutes) msg += ` (${meta.lateMinutes} min late)`;
      if (meta?.overtimeHours) msg += ` (${meta.overtimeHours}h overtime)`;
      if (meta?.shiftName) msg += ` — Shift: ${meta.shiftName}`;

      setResultMessage(msg);
      setClockedIn(action === "clock-in");
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function resetSession() {
    setChallengeId(null);
    setEmployeeCode("");
    setDisplayName("");
    setClockedIn(false);
    setLabel("");
    setError(null);
    setCodeInput("");
    setDeviceVerified(false);
    setExpired(false);
    setResultMessage(null);
    setStep("identify");
    if (pollRef.current) clearInterval(pollRef.current);
  }

  async function regenerateChallenge() {
    setExpired(false);
    setError(null);
    setDeviceVerified(false);
    setCodeInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/kiosk/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          employeeCode: employeeCode.trim(),
          displayName: displayName.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        challengeId?: string;
        clockedIn?: boolean;
        displayLabel?: string;
      };
      if (!res.ok) {
        setError(data.error || "Failed to regenerate");
        return;
      }
      setChallengeId(data.challengeId!);
      setClockedIn(Boolean(data.clockedIn));
      setStep("scan-qr");
    } catch {
      setError("Failed to regenerate code");
    } finally {
      setBusy(false);
    }
  }

  if (!companyId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-white">
        <p className="max-w-md text-center text-sm text-slate-300">
          Missing company in the URL. Ask your admin for the full kiosk link (it ends with{" "}
          <span className="font-mono text-slate-400">?c=…</span>).
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-white">
      <div className="mx-auto max-w-lg space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Check in / out</h1>
          {companyTitle ? (
            <p className="mt-1 text-sm text-slate-300">{companyTitle}</p>
          ) : null}
          {clockInHint && step === "identify" ? (
            <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {clockInHint}
            </p>
          ) : null}
          {linkError ? (
            <p className="mt-2 text-sm text-red-300">{linkError}</p>
          ) : null}
        </header>

        {/* Step 1: Identify — employee code + name */}
        {step === "identify" && (
          <form onSubmit={(e) => void handleVerify(e)} className="space-y-4 rounded-xl bg-slate-800 p-6">
            <div>
              <label className="text-xs text-slate-400">Your name</label>
              <Input
                className="mt-1 border-slate-600 bg-slate-900 text-white placeholder:text-slate-600"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                placeholder="Exact spelling as on your employee record"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Employee code</label>
              <Input
                className="mt-1 border-slate-600 bg-slate-900 text-white placeholder:text-slate-600"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                autoComplete="off"
                placeholder="e.g. ACME-F4E2D1-0001"
                required
              />
              <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
                Your company's auto-assigned code (letters, numbers, two hyphens). Case doesn't matter.
              </p>
            </div>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <Button
              type="submit"
              disabled={busy || !!linkError}
              className="w-full bg-amber-500 text-slate-900 hover:bg-amber-400"
            >
              {busy ? "Checking…" : "Continue"}
            </Button>
          </form>
        )}

        {/* Step 2: Scan QR — show QR code, wait for phone scan */}
        {step === "scan-qr" && (
          <div className="space-y-5 rounded-xl bg-slate-800 p-6 text-center">
            <div>
              <p className="text-sm text-slate-300">
                <span className="font-medium text-white">{label}</span>
                {clockedIn ? (
                  <span className="block text-xs text-amber-200/90">Currently checked in — scan to check out</span>
                ) : (
                  <span className="block text-xs text-slate-500">Scan to check in</span>
                )}
              </p>
            </div>

            {expired ? (
              <div className="space-y-3">
                <p className="text-sm text-amber-300">QR code expired.</p>
                <Button
                  onClick={() => void regenerateChallenge()}
                  disabled={busy}
                  className="bg-amber-500 text-slate-900 hover:bg-amber-400"
                >
                  {busy ? "Generating…" : "Generate new code"}
                </Button>
              </div>
            ) : (
              <>
                <div className="mx-auto flex w-fit rounded-xl bg-white p-4">
                  <QRCodeSVG value={getQrUrl()} size={220} level="M" />
                </div>
                <p className="text-xs text-slate-400">
                  Open your phone camera and scan this QR code.
                  <br />
                  A page will appear with your verification code.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                  <span className="text-xs text-slate-400">Waiting for phone scan…</span>
                </div>
              </>
            )}

            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <Button
              type="button"
              variant="ghost"
              className="w-full text-slate-400 hover:text-white"
              onClick={() => resetSession()}
            >
              Start over
            </Button>
          </div>
        )}

        {/* Step 3: Enter code — type the 6-digit code from phone */}
        {step === "enter-code" && (
          <form
            onSubmit={(e) => void handleSubmitCode(e)}
            className="space-y-5 rounded-xl bg-slate-800 p-6 text-center"
          >
            <div>
              <p className="text-sm text-slate-300">
                <span className="font-medium text-white">{label}</span>
              </p>
              <p className="mt-1 text-xs text-emerald-400">Device verified</p>
            </div>

            <div>
              <label className="text-xs text-slate-400">
                Enter the 6-digit code from your phone
              </label>
              <Input
                className="mt-2 border-slate-600 bg-slate-900 text-center text-2xl font-mono tracking-[0.3em] text-white placeholder:text-slate-600"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="------"
                maxLength={6}
                inputMode="numeric"
                autoFocus
                required
              />
            </div>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}

            <Button
              type="submit"
              disabled={busy || codeInput.length < 6}
              className="w-full bg-amber-500 text-slate-900 hover:bg-amber-400"
            >
              {busy ? "Processing…" : clockedIn ? "Check out" : "Check in"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-slate-400 hover:text-white"
              onClick={() => resetSession()}
            >
              Start over
            </Button>
          </form>
        )}

        {/* Step 4: Done — success confirmation */}
        {step === "done" && (
          <div className="space-y-5 rounded-xl bg-slate-800 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-lg font-medium text-white">{label}</p>
            {resultMessage ? (
              <p className="text-sm text-emerald-300">{resultMessage}</p>
            ) : null}
            <Button
              className="w-full bg-amber-500 text-slate-900 hover:bg-amber-400"
              onClick={() => resetSession()}
            >
              Next person
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KioskCheckinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-white">
          Loading…
        </div>
      }
    >
      <KioskInner />
    </Suspense>
  );
}
