"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Branded confirmation — no native window.confirm. Optional acknowledgment checkbox for sensitive actions.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  onConfirm,
  busy = false,
  requireAcknowledge = true,
  acknowledgeText = "I understand and want to continue.",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
  requireAcknowledge?: boolean;
  acknowledgeText?: string;
}) {
  const [ack, setAck] = useState(false);

  useEffect(() => {
    if (!open) setAck(false);
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="rounded-lg border border-hgh-gold/30 bg-gradient-to-b from-hgh-gold/10 to-transparent px-4 py-3 text-sm leading-relaxed text-hgh-slate">
          {description}
        </div>
        {requireAcknowledge ? (
          <label className="flex cursor-pointer items-start gap-2 text-xs text-hgh-slate">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-hgh-border text-hgh-navy focus:ring-hgh-gold"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            <span>{acknowledgeText}</span>
          </label>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={(requireAcknowledge && !ack) || busy}
            className="border border-amber-700/25 bg-white text-amber-900 hover:bg-amber-50"
            onClick={() => void onConfirm()}
          >
            {busy ? "…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
