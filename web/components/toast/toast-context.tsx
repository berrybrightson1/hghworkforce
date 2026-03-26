"use client";

import { createContext } from "react";
import type { ToastMessage } from "./toast-types";

export type ToastContextValue = {
  add: (t: Omit<ToastMessage, "id">) => void;
};

/** Single module = one context instance (avoids duplicate-context bugs across chunks). */
export const ToastContext = createContext<ToastContextValue | null>(null);
