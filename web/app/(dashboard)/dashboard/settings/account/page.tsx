"use client";

import { useSettingsActive } from "../settings-preview-context";
import { SettingsSectionView } from "../settings-section-view";

export default function SettingsAccountPage() {
  const active = useSettingsActive("account");
  return <SettingsSectionView active={active} />;
}
