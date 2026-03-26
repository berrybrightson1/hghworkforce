"use client";

import { useSettingsActive } from "../settings-preview-context";
import { SettingsSectionView } from "../settings-section-view";

export default function SettingsRolesPage() {
  const active = useSettingsActive("roles");
  return <SettingsSectionView active={active} />;
}
