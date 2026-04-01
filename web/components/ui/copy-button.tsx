"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast/useToast";
import { HintTooltip } from "@/components/ui/hint-tooltip";

type CopyIconButtonProps = {
  text: string;
  /** Accessible label for the control */
  label?: string;
  /** Cream tooltip copy (defaults to label) */
  hint?: string;
  className?: string;
  size?: "sm" | "md";
  showToast?: boolean;
};

export function CopyIconButton({
  text,
  label = "Copy to clipboard",
  hint,
  className,
  size = "sm",
  showToast = true,
}: CopyIconButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (showToast) toast.success("Copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  }, [text, toast, showToast]);

  const iconClass = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const btnClass = size === "md" ? "h-9 w-9" : "h-8 w-8";
  const hintText = hint ?? label;

  return (
    <HintTooltip content={hintText}>
      <button
        type="button"
        onClick={() => void onCopy()}
        aria-label={label}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md text-hgh-muted transition-colors",
          "hover:bg-hgh-offwhite hover:text-hgh-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold",
          copied && "text-hgh-success",
          btnClass,
          className,
        )}
      >
        {copied ? <Check className={iconClass} aria-hidden /> : <Copy className={iconClass} aria-hidden />}
      </button>
    </HintTooltip>
  );
}

/** Monospace value with copy control — for codes, URLs, etc. */
export function CopyableCode({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      <code className="min-w-0 truncate rounded bg-hgh-offwhite px-2 py-0.5 font-mono text-xs text-hgh-slate">
        {value}
      </code>
      <CopyIconButton
        text={value}
        label={`Copy ${value}`}
        hint="Copy this payroll code for spreadsheets, bank files, or pasting into support chat."
      />
    </div>
  );
}
