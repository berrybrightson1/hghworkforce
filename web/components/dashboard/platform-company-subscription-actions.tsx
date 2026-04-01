"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SubscriptionStatus } from "@prisma/client";
import { companyHasFullAccess } from "@/lib/billing/access";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/useToast";
import { HintTooltip } from "@/components/ui/hint-tooltip";

type Props = {
  companyId: string;
  companyName: string;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAtIso: string | null;
  createdAtIso: string;
  referralAccessUntilIso?: string | null;
};

export function PlatformCompanySubscriptionActions({
  companyId,
  companyName,
  subscriptionStatus,
  trialEndsAtIso,
  createdAtIso,
  referralAccessUntilIso,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<"grant" | "revoke" | null>(null);

  const locked = !companyHasFullAccess({
    subscriptionStatus,
    trialEndsAt: trialEndsAtIso ? new Date(trialEndsAtIso) : null,
    createdAt: new Date(createdAtIso),
    referralAccessUntil: referralAccessUntilIso ? new Date(referralAccessUntilIso) : null,
  });

  async function patchStatus(next: SubscriptionStatus, action: "grant" | "revoke") {
    setLoading(action);
    try {
      const res = await fetch(`/api/platform/companies/${encodeURIComponent(companyId)}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionStatus: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not update subscription");
        return;
      }
      toast.success(
        next === "ACTIVE"
          ? `Full access granted for ${companyName}.`
          : `Access updated for ${companyName} (${next}).`,
      );
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  if (subscriptionStatus !== "ACTIVE") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={loading !== null} onClick={() => void patchStatus("ACTIVE", "grant")}>
          {loading === "grant" ? "Saving…" : "Grant full access"}
        </Button>
        {locked ? (
          <HintTooltip content="This workspace is past its trial window and does not have an active subscription or referral credit window.">
            <span className="cursor-help text-xs text-amber-700">Locked</span>
          </HintTooltip>
        ) : null}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="text-xs"
      disabled={loading !== null}
      onClick={() => {
        if (
          !confirm(
            `Remove paid access for "${companyName}"? The workspace will follow normal trial rules again (trial may already be expired, so it may lock immediately).`,
          )
        ) {
          return;
        }
        void patchStatus("NONE", "revoke");
      }}
    >
      {loading === "revoke" ? "Saving…" : "Revoke paid access"}
    </Button>
  );
}
