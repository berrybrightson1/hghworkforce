"use client";

import { useSettingsActive } from "../settings-preview-context";
import { SettingsSectionView } from "../settings-section-view";

export default function SettingsOfficeKioskPage() {
  const active = useSettingsActive("office-kiosk");
  return <SettingsSectionView active={active} />;
}
