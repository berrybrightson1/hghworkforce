"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthenticatorCountdown } from "@/components/kiosk/authenticator-countdown";
import { normalizeKioskCompanyId } from "@/lib/kiosk-company-id";
import { formatLateMinutesHuman } from "@/lib/attendance-display";

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
  const [challengeExpiresAt, setChallengeExpiresAt] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!companyId) return;
    void (async () => {
      try {
        const res = await fetch(`/api/kiosk/status?companyId=${encodeURIComponent(companyId)}`);
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
          expiresAt?: string;
        };
        if (typeof data.expiresAt === "string") {
          setChallengeExpiresAt(data.expiresAt);
        }
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
        expiresAt?: string;
      };
      if (!res.ok) {
        const msg = [data.error, data.hint].filter(Boolean).join(" ").trim();
        setError(msg || "Verify failed");
        return;
      }
      setError(null);
      setChallengeId(data.challengeId!);
      if (typeof data.expiresAt === "string") setChallengeExpiresAt(data.expiresAt);
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
      if (meta?.lateMinutes) msg += ` (${formatLateMinutesHuman(meta.lateMinutes)} late)`;
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
    setChallengeExpiresAt(null);
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
        expiresAt?: string;
      };
      if (!res.ok) {
        setError(data.error || "Failed to regenerate");
        return;
      }
      setChallengeId(data.challengeId!);
      if (typeof data.expiresAt === "string") setChallengeExpiresAt(data.expiresAt);
      setClockedIn(Boolean(data.clockedIn));
      setStep("scan-qr");
    } catch {
      setError("Failed to regenerate code");
    } finally {
      setBusy(false);
    }
  }

  const cardClass =
    "space-y-4 rounded-xl border border-hgh-border bg-white p-6 shadow-sm";

  if (!companyId) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-hgh-offwhite p-6">
        <div className={cardClass}>
          <p className="text-center text-sm text-hgh-muted">
            Missing company in the URL. Ask your admin for the full kiosk link (it ends with{" "}
            <span className="font-mono text-hgh-navy">?c=…</span>).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-hgh-offwhite p-4 md:p-8">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <header className="rounded-xl border border-hgh-border bg-white px-5 py-4 shadow-sm">
          <h1 className="text-lg font-semibold text-hgh-navy md:text-xl">Office check-in / out</h1>
          {companyTitle ? <p className="mt-1 text-sm text-hgh-muted">{companyTitle}</p> : null}
          {clockInHint && step === "identify" ? (
            <p className="mt-3 rounded-lg border border-hgh-gold/30 bg-hgh-gold/10 px-3 py-2 text-xs text-hgh-navy">
              {clockInHint}
            </p>
          ) : null}
          {linkError ? <p className="mt-2 text-sm text-hgh-danger">{linkError}</p> : null}
        </header>

        {step === "identify" && (
          <form onSubmit={(e) => void handleVerify(e)} className={cardClass}>
            <div>
              <label className="text-xs font-medium text-hgh-muted" htmlFor="kiosk-name">
                Your name
              </label>
              <Input
                id="kiosk-name"
                className="mt-1"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                placeholder="Exact spelling as on your employee record"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-hgh-muted" htmlFor="kiosk-code">
                Employee code
              </label>
              <Input
                id="kiosk-code"
                className="mt-1 font-mono uppercase"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                autoComplete="off"
                placeholder="e.g. ACME-F4E2D1-0001"
                required
              />
              <p className="mt-1.5 text-[11px] leading-snug text-hgh-muted">
                Your company&apos;s auto-assigned code (letters, numbers, two hyphens). Case
                doesn&apos;t matter.
              </p>
            </div>
            {error ? <p className="text-sm text-hgh-danger">{error}</p> : null}
            <Button type="submit" variant="secondary" disabled={busy || !!linkError} className="w-full">
              {busy ? "Checking…" : "Continue"}
            </Button>
          </form>
        )}

        {step === "scan-qr" && (
          <div className={`${cardClass} text-center`}>
            <div>
              <p className="text-sm text-hgh-slate">
                <span className="font-medium text-hgh-navy">{label}</span>
                {clockedIn ? (
                  <span className="mt-1 block text-xs text-hgh-gold">
                    Currently checked in — scan to check out
                  </span>
                ) : (
                  <span className="mt-1 block text-xs text-hgh-muted">Scan to check in</span>
                )}
              </p>
            </div>

            {expired ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-hgh-navy">QR code expired.</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void regenerateChallenge()}
                  disabled={busy}
                  className="w-full"
                >
                  {busy ? "Generating…" : "Generate new code"}
                </Button>
              </div>
            ) : (
              <>
                <div className="mx-auto flex w-fit rounded-xl border border-hgh-border bg-white p-4 shadow-inner">
                  <QRCodeSVG value={getQrUrl()} size={220} level="M" />
                </div>
                <p className="text-center text-xs text-hgh-muted">
                  Open your phone camera and scan this QR code.
                  <br />
                  A page will appear with your verification code.
                </p>
                {challengeExpiresAt ? (
                  <div className="flex flex-col items-center gap-2 border-t border-hgh-border pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-hgh-muted">
                      Time to scan & enter code
                    </p>
                    <AuthenticatorCountdown
                      expiresAtIso={challengeExpiresAt}
                      onExpired={() => setExpired(true)}
                      size={64}
                      strokeWidth={3.5}
                      ringClassName="text-hgh-gold"
                      trackClassName="text-hgh-border"
                      labelClassName="text-hgh-muted"
                    />
                  </div>
                ) : null}
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-hgh-gold" />
                  <span className="text-xs text-hgh-muted">Waiting for phone scan…</span>
                </div>
              </>
            )}

            {error ? <p className="text-sm text-hgh-danger">{error}</p> : null}
            <Button type="button" variant="ghost" className="w-full text-hgh-muted hover:text-hgh-navy" onClick={() => resetSession()}>
              Start over
            </Button>
          </div>
        )}

        {step === "enter-code" && (
          <div className={cardClass + " text-center"}>
            {expired ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-hgh-navy">This code has expired.</p>
                <p className="text-xs text-hgh-muted">
                  Generate a fresh QR code and scan again with your phone.
                </p>
                <Button
                  onClick={() => void regenerateChallenge()}
                  disabled={busy}
                  className="w-full bg-hgh-navy hover:bg-hgh-navy/90"
                >
                  {busy ? "Generating…" : "Generate new code"}
                </Button>
                <Button type="button" variant="ghost" className="w-full text-hgh-muted hover:text-hgh-navy" onClick={() => resetSession()}>
                  Start over
                </Button>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubmitCode(e)} className="space-y-5">
                <div>
                  <p className="text-sm text-hgh-slate">
                    <span className="font-medium text-hgh-navy">{label}</span>
                  </p>
                  <p className="mt-1 text-xs font-medium text-hgh-success">Device verified</p>
                </div>

                {challengeExpiresAt ? (
                  <div className="flex flex-col items-center gap-2 border-b border-hgh-border pb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-hgh-muted">
                      Code expires in
                    </p>
                    <AuthenticatorCountdown
                      expiresAtIso={challengeExpiresAt}
                      onExpired={() => setExpired(true)}
                      size={72}
                      strokeWidth={4}
                      ringClassName="text-hgh-gold"
                      trackClassName="text-hgh-border"
                      labelClassName="text-hgh-muted"
                    />
                  </div>
                ) : null}

                <div className="text-left">
                  <label className="text-xs font-medium text-hgh-muted" htmlFor="kiosk-six">
                    Enter the 6-digit code from your phone
                  </label>
                  <Input
                    id="kiosk-six"
                    className="mt-2 text-center text-2xl font-mono tracking-[0.3em]"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="------"
                    maxLength={6}
                    inputMode="numeric"
                    autoFocus
                    required
                  />
                </div>

                {error ? <p className="text-sm text-hgh-danger">{error}</p> : null}

                <Button
                  type="submit"
                  disabled={busy || codeInput.length < 6}
                  variant={clockedIn ? "danger" : "secondary"}
                  className={
                    clockedIn
                      ? "w-full"
                      : "w-full bg-hgh-success hover:bg-hgh-success/90 focus-visible:ring-hgh-success/35"
                  }
                >
                  {busy ? "Processing…" : clockedIn ? "Check out" : "Check in"}
                </Button>

                <Button type="button" variant="ghost" className="w-full text-hgh-muted hover:text-hgh-navy" onClick={() => resetSession()}>
                  Start over
                </Button>
              </form>
            )}
          </div>
        )}

        {step === "done" && (
          <div className={cardClass + " text-center"}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-hgh-success/15">
              <svg className="h-8 w-8 text-hgh-success" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-hgh-navy">{label}</p>
            {resultMessage ? <p className="text-sm text-hgh-success">{resultMessage}</p> : null}
            <Button type="button" variant="secondary" className="w-full" onClick={() => resetSession()}>
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
        <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-hgh-offwhite p-6">
          <p className="text-sm text-hgh-muted">Loading…</p>
        </div>
      }
    >
      <KioskInner />
    </Suspense>
  );
}
