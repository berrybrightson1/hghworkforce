"use client";

import { useSettingsActive } from "../settings-preview-context";
import { SettingsSectionView } from "../settings-section-view";

export default function SettingsWebhooksPage() {
  const active = useSettingsActive("webhooks");
  return <SettingsSectionView active={active} />;
}
