"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeKioskCompanyId } from "@/lib/kiosk-company-id";
import { detectFaceDescriptorFromVideo, ensureFaceApiModelsLoaded } from "@/lib/face-api-client";

function KioskInner() {
  const searchParams = useSearchParams();
  const companyId = normalizeKioskCompanyId(
    searchParams.get("c") ?? searchParams.get("companyId"),
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [employeeCode, setEmployeeCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [clockedIn, setClockedIn] = useState(false);
  const [label, setLabel] = useState("");
  const [companyTitle, setCompanyTitle] = useState<string | null>(null);
  const [clockInHint, setClockInHint] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  const startCamera = useCallback(async () => {
    if (cameraOn) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    streamRef.current = stream;
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      await video.play();
    }
    setCameraOn(true);
  }, [cameraOn]);

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
          setCompanyTitle(null);
          setClockInHint(null);
          return;
        }
        setLinkError(null);
        if (typeof data.companyName === "string") {
          setCompanyTitle(data.companyName);
        }
        if (data.clockInAllowed === false && data.clockInBlockedReason) {
          setClockInHint(data.clockInBlockedReason);
        } else {
          setClockInHint(null);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [companyId]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        await ensureFaceApiModelsLoaded();
        if (!cancelled) setModelsLoaded(true);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Could not load face recognition models.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

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
        token?: string;
        clockedIn?: boolean;
        displayLabel?: string;
      };
      if (!res.ok) {
        const msg = [data.error, data.hint].filter(Boolean).join(" ");
        throw new Error(msg || "Verify failed");
      }
      setToken(data.token!);
      setClockedIn(Boolean(data.clockedIn));
      setLabel(String(data.displayLabel || ""));
      await startCamera();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function getFaceDescriptor(): Promise<number[]> {
    const video = videoRef.current;
    if (!video) throw new Error("Camera not ready");
    return detectFaceDescriptorFromVideo(video);
  }

  async function doClock(action: "clock-in" | "clock-out") {
    if (!token) return;
    setError(null);
    setBusy(true);
    try {
      const faceDescriptor = await getFaceDescriptor();
      const res = await fetch("/api/kiosk/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, faceDescriptor }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; hint?: string };
      if (!res.ok) {
        throw new Error([data.error, data.hint].filter(Boolean).join(" ") || "Request failed");
      }
      if (action === "clock-in") setClockedIn(true);
      else setClockedIn(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function resetSession() {
    setToken(null);
    setEmployeeCode("");
    setDisplayName("");
    setClockedIn(false);
    setLabel("");
    setModelsLoaded(false);
    setError(null);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
    if (videoRef.current) videoRef.current.srcObject = null;
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
          {clockInHint && !token ? (
            <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {clockInHint}
            </p>
          ) : null}
        </header>

        {!token ? (
          <form onSubmit={(e) => void handleVerify(e)} className="space-y-4 rounded-xl bg-slate-800 p-6">
            <div>
              <label className="text-xs text-slate-400">Your name (as on record)</label>
              <Input
                className="mt-1 border-slate-600 bg-slate-900 text-white placeholder:text-slate-600"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
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
                required
              />
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
        ) : (
          <div className="space-y-4 rounded-xl bg-slate-800 p-6">
            <p className="text-sm text-slate-300">
              <span className="font-medium text-white">{label}</span>
              {clockedIn ? (
                <span className="block text-xs text-amber-200/90">Currently checked in</span>
              ) : (
                <span className="block text-xs text-slate-500">Not checked in</span>
              )}
            </p>
            <div className="aspect-video overflow-hidden rounded-lg bg-black">
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            </div>
            {!modelsLoaded ? (
              <p className="text-sm text-slate-400">Loading face models…</p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="flex-1 bg-amber-500 text-slate-900 hover:bg-amber-400"
                  disabled={busy || clockedIn}
                  onClick={() => void doClock("clock-in")}
                >
                  Check in
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 border-slate-600 bg-slate-700 text-white hover:bg-slate-600"
                  disabled={busy || !clockedIn}
                  onClick={() => void doClock("clock-out")}
                >
                  Check out
                </Button>
              </div>
            )}
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <Button
              type="button"
              variant="ghost"
              className="w-full text-slate-400 hover:text-white"
              onClick={() => resetSession()}
            >
              Different person
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
