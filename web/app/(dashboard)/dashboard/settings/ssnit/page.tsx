"use client";

import { useSettingsActive } from "../settings-preview-context";
import { SettingsSectionView } from "../settings-section-view";

export default function SettingsSsnitPage() {
  const active = useSettingsActive("ssnit");
  return <SettingsSectionView active={active} />;
}
