"use client";

import { useSettingsActive } from "../settings-preview-context";
import { SettingsSectionView } from "../settings-section-view";

export default function SettingsAuditPage() {
  const active = useSettingsActive("audit");
  return <SettingsSectionView active={active} />;
}
