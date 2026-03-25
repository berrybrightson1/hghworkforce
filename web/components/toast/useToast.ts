"use client";

import { useMemo } from "react";
import { useToastContext } from "./ToastProvider";

export function useToast() {
  const { add } = useToastContext();
  return useMemo(
    () => ({
      toast: {
        success: (message: string) => add({ variant: "success", message }),
        error: (message: string) => add({ variant: "error", message }),
        warning: (message: string) => add({ variant: "warning", message }),
        info: (message: string) => add({ variant: "info", message }),
      },
    }),
    [add],
  );
}
