import { AdminNotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Create an admin notification visible to all HR / admin users in the workspace.
 *
 * Call this from any server-side API route when an event worth surfacing occurs.
 *
 * @example
 * ```ts
 * await notifyAdmins({
 *   companyId,
 *   type: "LEAVE_REQUEST",
 *   title: "New leave request",
 *   message: "John Doe requested 3 days annual leave (Apr 10–12).",
 *   linkUrl: "/dashboard/inbox",
 *   actorName: "John Doe",
 * });
 * ```
 */
export async function notifyAdmins(params: {
  companyId: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  actorName?: string;
}) {
  return prisma.adminNotification.create({
    data: {
      companyId: params.companyId,
      type: params.type,
      title: params.title,
      message: params.message,
      linkUrl: params.linkUrl ?? null,
      actorName: params.actorName ?? null,
    },
  });
}
