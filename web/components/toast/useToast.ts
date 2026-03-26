"use client";

import { useContext, useMemo } from "react";
import { ToastContext } from "./toast-context";

export function useToast() {
  const ctx = useContext(ToastContext);

  return useMemo(() => {
    const add = ctx?.add;
    if (add) {
      return {
        toast: {
          success: (message: string) => add({ variant: "success", message }),
          error: (message: string) => add({ variant: "error", message }),
          warning: (message: string) => add({ variant: "warning", message }),
          info: (message: string) => add({ variant: "info", message }),
        },
      };
    }
    const devLog =
      process.env.NODE_ENV === "development"
        ? (variant: string, message: string) =>
            console.warn(`[${variant}] ${message} (wrap with ToastProvider to show UI)`)
        : () => {};
    return {
      toast: {
        success: (message: string) => devLog("toast:success", message),
        error: (message: string) => devLog("toast:error", message),
        warning: (message: string) => devLog("toast:warning", message),
        info: (message: string) => devLog("toast:info", message),
      },
    };
  }, [ctx]);
}
