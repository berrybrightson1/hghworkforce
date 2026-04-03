import { EmployeeStatus } from "@prisma/client";
import { notifyAdmins } from "@/lib/admin-notifications";
import { prisma } from "@/lib/prisma";
import { ensureTrialEndingAdminNotification } from "@/lib/trial-ending-notification";

/** Stable titles for sync/delete — referenced by ensure logic only. */
export const KIOSK_DEVICE_BINDING_NOTIFICATION_TITLE = "Kiosk check-in: bind employee devices";
export const INBOX_PENDING_NOTIFICATION_TITLE = "Inbox: items need your approval";
export const PAYRUN_PENDING_APPROVAL_NOTIFICATION_TITLE = "Payroll: runs awaiting approval";

/** One row per `title` per company; when counts change, message updates and read state resets. */
async function syncAttentionNotification(params: {
  companyId: string;
  title: string;
  message: string | null;
  linkUrl?: string;
}): Promise<void> {
  const { companyId, title, message, linkUrl } = params;

  if (!message) {
    await prisma.adminNotification.deleteMany({ where: { companyId, title } });
    return;
  }

  const latest = await prisma.adminNotification.findFirst({
    where: { companyId, title },
    orderBy: { createdAt: "desc" },
  });

  if (!latest) {
    await notifyAdmins({
      companyId,
      type: "SYSTEM_NOTICE",
      title,
      message,
      ...(linkUrl != null ? { linkUrl } : {}),
    });
    return;
  }

  if (latest.message !== message) {
    await prisma.adminNotification.update({
      where: { id: latest.id },
      data: {
        message,
        linkUrl: linkUrl ?? latest.linkUrl,
        readByUserIds: [],
      },
    });
    return;
  }

  if (linkUrl != null && latest.linkUrl !== linkUrl) {
    await prisma.adminNotification.update({
      where: { id: latest.id },
      data: { linkUrl },
    });
  }
}

/**
 * Upserts billing + operational “needs attention” rows for the workspace bell.
 * Call from GET admin-notifications after billing gate succeeds.
 */
export async function ensureCompanyAttentionNotifications(companyId: string): Promise<void> {
  await ensureTrialEndingAdminNotification(companyId);

  const missingDeviceCount = await prisma.employee.count({
    where: {
      companyId,
      status: EmployeeStatus.ACTIVE,
      deletedAt: null,
      deviceBoundAt: null,
    },
  });

  const kioskMessage =
    missingDeviceCount > 0
      ? `${missingDeviceCount} active employee${missingDeviceCount === 1 ? "" : "s"} still need a device bound for office kiosk check-in. Open each profile → Device binding, or use the setup wizard.`
      : null;

  await syncAttentionNotification({
    companyId,
    title: KIOSK_DEVICE_BINDING_NOTIFICATION_TITLE,
    message: kioskMessage,
    linkUrl: "/dashboard/employees",
  });

  const [pendingLeave, pendingCorrections, pendingLoans] = await prisma.$transaction([
    prisma.leaveRequest.count({
      where: { status: "PENDING", employee: { companyId, deletedAt: null } },
    }),
    prisma.attendanceCorrectionRequest.count({
      where: { companyId, status: "PENDING" },
    }),
    prisma.loan.count({
      where: { status: "PENDING", employee: { companyId, deletedAt: null } },
    }),
  ]);

  const inboxTotal = pendingLeave + pendingCorrections + pendingLoans;
  const inboxParts: string[] = [];
  if (pendingLeave) inboxParts.push(`${pendingLeave} leave`);
  if (pendingCorrections) inboxParts.push(`${pendingCorrections} attendance fix${pendingCorrections === 1 ? "" : "es"}`);
  if (pendingLoans) inboxParts.push(`${pendingLoans} loan`);

  const inboxMessage =
    inboxTotal > 0
      ? `You have ${inboxTotal} pending item${inboxTotal === 1 ? "" : "s"} in the inbox (${inboxParts.join(", ")}). Review and approve or decline.`
      : null;

  await syncAttentionNotification({
    companyId,
    title: INBOX_PENDING_NOTIFICATION_TITLE,
    message: inboxMessage,
    linkUrl: "/dashboard/inbox",
  });

  const pendingPayruns = await prisma.payrun.count({
    where: { companyId, status: "PENDING" },
  });

  const payrunMessage =
    pendingPayruns > 0
      ? `${pendingPayruns} pay run${pendingPayruns === 1 ? "" : "s"} ${pendingPayruns === 1 ? "is" : "are"} submitted and waiting for approval. Open Payroll to review.`
      : null;

  await syncAttentionNotification({
    companyId,
    title: PAYRUN_PENDING_APPROVAL_NOTIFICATION_TITLE,
    message: payrunMessage,
    linkUrl: "/dashboard/payroll",
  });
}
