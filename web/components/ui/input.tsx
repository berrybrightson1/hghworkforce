import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-hgh-border bg-white px-3 py-2 text-base text-hgh-slate shadow-sm transition-colors placeholder:text-hgh-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold lg:text-sm",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
