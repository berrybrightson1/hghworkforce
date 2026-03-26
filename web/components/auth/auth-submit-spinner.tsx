export function AuthSubmitSpinner({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-hgh-navy/25 border-t-hgh-navy ${className ?? ""}`}
      aria-hidden
    />
  );
}
