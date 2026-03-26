"use client";

import { useSettingsActive } from "../settings-preview-context";
import { SettingsSectionView } from "../settings-section-view";

export default function SettingsTaxesPage() {
  const active = useSettingsActive("taxes");
  return <SettingsSectionView active={active} />;
}
