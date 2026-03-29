"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, Circle, CircleCheck, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

/** Trigger matches app field spec: leading Layers icon, navy focus/open ring, chevron flips when open. */
const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    /** Omit the leading icon in very tight layouts (defaults to false). */
    hideLeadingIcon?: boolean;
  }
>(({ className, children, hideLeadingIcon, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "group flex h-10 w-full items-center gap-2 rounded-md border-2 border-hgh-border bg-white px-3 py-2 text-left text-base text-hgh-slate shadow-sm transition-[border-color,box-shadow] duration-150 lg:text-sm",
      "hover:border-hgh-slate/35",
      "focus:outline-none focus-visible:border-hgh-navy",
      "data-[state=open]:border-hgh-navy",
      "data-[placeholder]:text-hgh-muted",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {!hideLeadingIcon && (
      <Layers className="h-4 w-4 shrink-0 text-hgh-muted transition-colors group-data-[state=open]:text-hgh-navy/80" aria-hidden />
    )}
    <span className="flex min-w-0 flex-1 items-center overflow-hidden text-left [&_span]:truncate">
      {children}
    </span>
    <SelectPrimitive.Icon asChild>
      <ChevronDown
        className="h-4 w-4 shrink-0 text-hgh-slate transition-transform duration-200 group-data-[state=open]:-rotate-180"
        aria-hidden
      />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", sideOffset = 6, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={sideOffset}
      className={cn(
        "relative z-[250] max-h-64 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border-2 border-hgh-border bg-white py-1 shadow-lg shadow-hgh-navy/10",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="max-h-56 overflow-y-auto p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "group relative flex w-full cursor-pointer select-none items-center rounded-md py-2.5 pl-10 pr-3 text-sm outline-none transition-colors",
      "text-hgh-slate data-[state=checked]:text-hgh-navy",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      "data-[highlighted]:bg-hgh-offwhite data-[highlighted]:text-hgh-navy",
      className,
    )}
    {...props}
  >
    <span
      className="pointer-events-none absolute left-2.5 flex h-4 w-4 items-center justify-center text-hgh-muted transition-colors group-data-[highlighted]:text-hgh-navy group-data-[state=checked]:text-hgh-navy"
      aria-hidden
    >
      <Circle
        className="absolute h-4 w-4 group-data-[state=checked]:opacity-0"
        strokeWidth={1.5}
      />
      <SelectPrimitive.ItemIndicator asChild>
        <CircleCheck className="h-4 w-4 text-hgh-navy" strokeWidth={2} />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-hgh-border", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectSeparator,
};
