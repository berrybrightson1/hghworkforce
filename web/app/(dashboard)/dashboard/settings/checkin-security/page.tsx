"use client";

import { useSettingsActive } from "../settings-preview-context";
import { SettingsSectionView } from "../settings-section-view";

export default function SettingsCheckinSecurityPage() {
  const active = useSettingsActive("checkin-security");
  return <SettingsSectionView active={active} />;
}
