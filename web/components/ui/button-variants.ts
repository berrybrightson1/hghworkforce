import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold focus-visible:ring-offset-2 focus-visible:ring-offset-hgh-offwhite disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-hgh-gold text-hgh-navy hover:bg-hgh-gold/90",
        secondary: "bg-hgh-navy text-white hover:bg-hgh-navy-light",
        ghost: "text-hgh-slate hover:bg-hgh-border/40",
        danger: "bg-hgh-danger text-white hover:bg-hgh-danger/90",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);
