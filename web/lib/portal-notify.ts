import type { PortalNotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Creates an in-app notification for an employee (PIN portal or linked user).
 */
export async function notifyEmployee(
  employeeId: string,
  tenantId: string,
  type: PortalNotificationType,
  title: string,
  message: string,
  linkUrl?: string,
) {
  await prisma.portalNotification.create({
    data: {
      employeeId,
      tenantId,
      type,
      title,
      message,
      linkUrl: linkUrl ?? null,
    },
  });
}
