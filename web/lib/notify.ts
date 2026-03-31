import type { PortalNotificationType } from "@prisma/client";
import { notifyEmployee } from "@/lib/portal-notify";

/**
 * In-app employee notifications today; extend with email/SMS later without changing call sites.
 */
export async function notifyEmployeeInApp(
  employeeId: string,
  tenantId: string,
  type: PortalNotificationType,
  title: string,
  message: string,
  linkUrl?: string,
): Promise<void> {
  await notifyEmployee(employeeId, tenantId, type, title, message, linkUrl);
}
