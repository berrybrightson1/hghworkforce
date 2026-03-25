"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/useToast";
import { detectFaceDescriptorFromVideo, ensureFaceApiModelsLoaded } from "@/lib/face-api-client";

/**
 * Camera capture + POST /api/employees/[employeeId]/face-descriptor.
 * Used on employee portal check-in and dashboard employee profile (admin or self).
 */
export function FaceEnrollmentCapture({
  employeeId,
  onSuccess,
  className,
}: {
  employeeId: string;
  onSuccess?: () => void;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void ensureFaceApiModelsLoaded()
      .then(() => {
        if (!cancelled) setModelsReady(true);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load face recognition models.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play();
      }
      setCameraOn(true);
    } catch {
      toast.error("Could not access the camera.");
    }
  }

  async function save() {
    const video = videoRef.current;
    if (!video) return;
    setBusy(true);
    try {
      const descriptor = await detectFaceDescriptorFromVideo(video);
      const res = await fetch(`/api/employees/${employeeId}/face-descriptor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Face profile saved. You can use the office kiosk and face check-in.");
      stopCamera();
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save face profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      {!modelsReady ? (
        <p className="text-xs text-hgh-muted">Loading face models…</p>
      ) : (
        <>
          <div className="mx-auto aspect-video max-w-md overflow-hidden rounded-lg bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            {!cameraOn ? (
              <Button type="button" size="sm" onClick={() => void startCamera()}>
                Turn on camera
              </Button>
            ) : (
              <>
                <Button type="button" size="sm" onClick={() => void save()} disabled={busy}>
                  {busy ? "Saving…" : "Save face profile"}
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={stopCamera}>
                  Stop camera
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
