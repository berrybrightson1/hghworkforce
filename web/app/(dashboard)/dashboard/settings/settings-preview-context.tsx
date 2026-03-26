"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { SettingsSectionId } from "./types";

type SettingsPreviewContextValue = {
  previewSection: SettingsSectionId | null;
  setPreviewSection: (id: SettingsSectionId | null) => void;
};

const SettingsPreviewContext = createContext<SettingsPreviewContextValue | null>(null);

export function SettingsPreviewProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [previewSection, setPreviewSectionState] = useState<SettingsSectionId | null>(null);

  const setPreviewSection = useCallback((id: SettingsSectionId | null) => {
    setPreviewSectionState(id);
  }, []);

  useEffect(() => {
    setPreviewSectionState(null);
  }, [pathname]);

  const value = useMemo(
    () => ({ previewSection, setPreviewSection }),
    [previewSection, setPreviewSection],
  );

  return (
    <SettingsPreviewContext.Provider value={value}>{children}</SettingsPreviewContext.Provider>
  );
}

/** When hovering the side nav, `previewSection` overrides the routed section for display only. */
export function useSettingsActive(routeSection: SettingsSectionId): SettingsSectionId {
  const ctx = useContext(SettingsPreviewContext);
  if (!ctx) return routeSection;
  return ctx.previewSection ?? routeSection;
}

export function useSettingsPreviewNav() {
  const ctx = useContext(SettingsPreviewContext);
  if (!ctx) {
    throw new Error("useSettingsPreviewNav must be used within SettingsPreviewProvider");
  }
  return ctx;
}

/** Debounced clear when pointer leaves the nav strip so moving to another link doesn’t flicker. */
export function useSettingsNavHoverClear() {
  const { setPreviewSection } = useSettingsPreviewNav();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClear = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleClear = useCallback(() => {
    cancelClear();
    timerRef.current = setTimeout(() => {
      setPreviewSection(null);
      timerRef.current = null;
    }, 160);
  }, [cancelClear, setPreviewSection]);

  useEffect(() => () => cancelClear(), [cancelClear]);

  return { cancelClear, scheduleClear, setPreviewSection };
}
