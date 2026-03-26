"use client";

import { useSettingsActive } from "../settings-preview-context";
import { SettingsSectionView } from "../settings-section-view";

export default function SettingsTier2Page() {
  const active = useSettingsActive("tier2-pension");
  return <SettingsSectionView active={active} />;
}
