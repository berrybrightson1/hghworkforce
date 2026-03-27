import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { decodeWebhookSecretForHmac } from "@/lib/webhook-secret";

function signBody(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * POST JSON to each active company webhook. Signature: X-HGH-Signature: sha256=<hex>
 */
export async function deliverCompanyWebhooks(
  companyId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const hooks = await prisma.companyWebhook.findMany({
    where: {
      companyId,
      isActive: true,
      ...(event === "payrun.approved" ? { payrunApproved: true } : {}),
    },
  });
  if (hooks.length === 0) return;

  const envelope = { event, ...payload, sentAt: new Date().toISOString() };
  const body = JSON.stringify(envelope);

  await Promise.allSettled(
    hooks.map(async (h) => {
      const sig = signBody(decodeWebhookSecretForHmac(h.secret), body);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10_000);
      try {
        await fetch(h.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-HGH-Signature": `sha256=${sig}`,
            "X-HGH-Event": event,
          },
          body,
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(t);
      }
    }),
  );
}
