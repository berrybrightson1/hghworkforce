"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import type { ToastMessage, ToastVariant } from "./toast-types";
import { ToastContext } from "./toast-context";

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const cls = "shrink-0";
  switch (variant) {
    case "success":
      return <CheckCircle2 size={20} className={`${cls} text-hgh-success`} />;
    case "error":
      return <XCircle size={20} className={`${cls} text-hgh-danger`} />;
    case "warning":
      return <AlertTriangle size={20} className={`${cls} text-hgh-gold`} />;
    case "info":
      return <Info size={20} className={`${cls} text-white`} />;
  }
}

function borderClass(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return "border-l-hgh-success";
    case "error":
      return "border-l-hgh-danger";
    case "warning":
      return "border-l-hgh-gold";
    case "info":
      return "border-l-hgh-navy-light";
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (t: Omit<ToastMessage, "id">) => {
      const id = `toast-${++idRef.current}`;
      setToasts((prev) => [...prev.slice(-4), { ...t, id }]);
      window.setTimeout(() => remove(id), 7000);
    },
    [remove],
  );

  const value = useMemo(() => ({ add }), [add]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(100%,22rem)] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`pointer-events-auto animate-toast-in overflow-hidden rounded-lg border border-white/10 border-l-4 ${borderClass(t.variant)} bg-hgh-navy/95 text-white shadow-lg backdrop-blur-sm`}
          >
            <div className="flex items-start gap-3 p-3">
              <ToastIcon variant={t.variant} />
              <p className="flex-1 text-sm leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="shrink-0 rounded p-1 text-hgh-muted transition hover:bg-white/10 hover:text-white"
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
            <div className="h-0.5 w-full bg-white/10">
              <div className="h-full bg-hgh-gold/80 animate-toast-progress" />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
