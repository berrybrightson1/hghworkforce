"use client";

import Link from "next/link";
import * as React from "react";
import { HintTooltip } from "@/components/ui/hint-tooltip";

/** Next.js `Link` with the shared cream hover hint. */
export function HintLink({
  href,
  hint,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { hint: React.ReactNode }) {
  return (
    <HintTooltip content={hint}>
      <Link href={href} {...props}>
        {children}
      </Link>
    </HintTooltip>
  );
}
