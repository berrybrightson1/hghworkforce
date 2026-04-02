import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-hgh-navy/10 text-hgh-navy",
        success: "bg-hgh-success/15 text-hgh-success",
        danger: "bg-hgh-danger/15 text-hgh-danger",
        warning: "bg-hgh-gold-light text-hgh-navy",
        verified: "bg-hgh-gold/15 text-hgh-gold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
