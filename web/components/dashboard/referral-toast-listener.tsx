"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/toast/useToast";

/**
 * Shows a one-time in-app toast when another user completed checkout with this account as referrer.
 */
export function ReferralToastListener() {
  const { toast } = useToast();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void (async () => {
      try {
        const res = await fetch("/api/me/referral-toasts");
        const data = (await res.json().catch(() => ({}))) as {
          pending?: { id: string; message: string } | null;
        };
        if (!data.pending) return;
        toast.success(data.pending.message, { useRedeemIcon: true });
        await fetch("/api/me/referral-toasts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: data.pending.id }),
        });
      } catch {
        /* ignore */
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: single fetch on dashboard mount
  }, []);

  return null;
}
