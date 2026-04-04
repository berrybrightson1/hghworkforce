import {
  EmployeeStatus,
  InvitationStatus,
  PayrunStatus,
  PerformanceCycleStatus,
} from "@prisma/client";
import { notifyAdmins } from "@/lib/admin-notifications";
import { prisma } from "@/lib/prisma";
import { ensureTrialEndingAdminNotification } from "@/lib/trial-ending-notification";

/** Stable titles for sync/delete — referenced by ensure logic only. */
export const KIOSK_DEVICE_BINDING_NOTIFICATION_TITLE = "Kiosk check-in: bind employee devices";
export const INBOX_PENDING_NOTIFICATION_TITLE = "Inbox: items need your approval";
export const PAYRUN_PENDING_APPROVAL_NOTIFICATION_TITLE = "Payroll: runs awaiting approval";
/** Matches payroll list / draft “how it works” callouts — surfaced in the bell for admins. */
export const PAYROLL_HOW_AMOUNTS_NOTIFICATION_TITLE = "Payroll: how pay amounts work";
export const PAYROLL_DRAFT_NEEDS_LINES_NOTIFICATION_TITLE = "Payroll: drafts need lines generated";
export const PAYROLL_NO_RUNS_YET_NOTIFICATION_TITLE = "Payroll: create your first pay run";
export const WORKPLACE_PAY_QUERIES_NOTIFICATION_TITLE = "Workplace: pay queries need a response";
export const WORKPLACE_PROFILE_CHANGES_NOTIFICATION_TITLE = "Workplace: profile changes to review";
export const WORKPLACE_ANONYMOUS_FEEDBACK_NOTIFICATION_TITLE = "Workplace: new anonymous feedback";
export const ONBOARDING_STAFF_IN_PROGRESS_NOTIFICATION_TITLE = "Onboarding: staff still in progress";
export const PERFORMANCE_REVIEWS_ACTION_NOTIFICATION_TITLE = "Performance: reviews need completing";
export const EXITS_ATTENTION_NOTIFICATION_TITLE = "Exits: clearance or cases in progress";
export const TEAM_INVITATIONS_PENDING_NOTIFICATION_TITLE = "Team: pending invitations";
export const PORTAL_PIN_RESETS_NOTIFICATION_TITLE = "Portal: PIN reset requests";

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

  const activeEmployeeCount = await prisma.employee.count({
    where: { companyId, status: EmployeeStatus.ACTIVE, deletedAt: null },
  });

  const payrollHowMessage =
    activeEmployeeCount > 0
      ? "Salaries are not picked per pay run. Each line uses that employee’s basic salary and recurring components from Employees — open a draft pay run, click Generate payroll lines for every active staff member, then submit. Regenerate after pay changes while the run is still draft. Submit goes to an approver; approved runs lock and you can export Bank CSV and Payslips (ZIP) from the run."
      : null;

  await syncAttentionNotification({
    companyId,
    title: PAYROLL_HOW_AMOUNTS_NOTIFICATION_TITLE,
    message: payrollHowMessage,
    linkUrl: "/dashboard/payroll",
  });

  const draftRunsWithoutLines = await prisma.payrun.count({
    where: {
      companyId,
      status: PayrunStatus.DRAFT,
      lines: { none: {} },
    },
  });

  const draftLinesMessage =
    draftRunsWithoutLines > 0
      ? `${draftRunsWithoutLines} draft pay run${draftRunsWithoutLines === 1 ? "" : "s"} ${draftRunsWithoutLines === 1 ? "has" : "have"} no payroll lines yet. Open Payroll, open each draft, and click Generate payroll lines before submitting.`
      : null;

  await syncAttentionNotification({
    companyId,
    title: PAYROLL_DRAFT_NEEDS_LINES_NOTIFICATION_TITLE,
    message: draftLinesMessage,
    linkUrl: "/dashboard/payroll",
  });

  const [
    payrunTotal,
    payQueriesOpen,
    profileChangesPending,
    anonymousFeedbackNew,
    onboardingsInProgress,
    performanceReviewsOpen,
    exitRecordsInFlight,
    exitClearancePending,
    pinResetsPending,
    pendingInvitations,
  ] = await prisma.$transaction([
    prisma.payrun.count({ where: { companyId } }),
    prisma.payQuery.count({
      where: { companyId, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.profileChangeRequest.count({
      where: { companyId, status: "PENDING" },
    }),
    prisma.anonymousFeedback.count({
      where: { companyId, status: "NEW" },
    }),
    prisma.employeeOnboarding.count({
      where: {
        companyId,
        status: { in: ["PENDING", "IN_PROGRESS", "OVERDUE"] },
      },
    }),
    prisma.performanceReview.count({
      where: {
        status: { not: "COMPLETED" },
        cycle: { companyId, status: PerformanceCycleStatus.ACTIVE },
      },
    }),
    prisma.exitRecord.count({
      where: { companyId, status: { in: ["INITIATED", "IN_PROGRESS"] } },
    }),
    prisma.exitClearanceItem.count({
      where: { status: "PENDING", exitRecord: { companyId } },
    }),
    prisma.pinResetRequest.count({
      where: { companyId, status: "PENDING" },
    }),
    prisma.invitation.count({
      where: {
        companyId,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    }),
  ]);

  const payrollStarterMessage =
    activeEmployeeCount > 0 && payrunTotal === 0
      ? "You have active employees but no pay runs yet. Open Payroll → New Pay Run, set the period, then generate lines before you submit."
      : null;

  await syncAttentionNotification({
    companyId,
    title: PAYROLL_NO_RUNS_YET_NOTIFICATION_TITLE,
    message: payrollStarterMessage,
    linkUrl: "/dashboard/payroll",
  });

  const payQueryMessage =
    payQueriesOpen > 0
      ? `${payQueriesOpen} pay quer${payQueriesOpen === 1 ? "y" : "ies"} from staff ${payQueriesOpen === 1 ? "is" : "are"} still open or in progress. Reply under Workplace → Comms.`
      : null;

  await syncAttentionNotification({
    companyId,
    title: WORKPLACE_PAY_QUERIES_NOTIFICATION_TITLE,
    message: payQueryMessage,
    linkUrl: "/dashboard/workplace/comms",
  });

  const profileMsg =
    profileChangesPending > 0
      ? `${profileChangesPending} employee profile change request${profileChangesPending === 1 ? "" : "s"} waiting for approval. Review under Workplace → Comms.`
      : null;

  await syncAttentionNotification({
    companyId,
    title: WORKPLACE_PROFILE_CHANGES_NOTIFICATION_TITLE,
    message: profileMsg,
    linkUrl: "/dashboard/workplace/comms",
  });

  const feedbackMsg =
    anonymousFeedbackNew > 0
      ? `${anonymousFeedbackNew} new anonymous feedback message${anonymousFeedbackNew === 1 ? "" : "s"} to review. Open Workplace → Comms.`
      : null;

  await syncAttentionNotification({
    companyId,
    title: WORKPLACE_ANONYMOUS_FEEDBACK_NOTIFICATION_TITLE,
    message: feedbackMsg,
    linkUrl: "/dashboard/workplace/comms",
  });

  const onboardingMsg =
    onboardingsInProgress > 0
      ? `${onboardingsInProgress} employee onboarding${onboardingsInProgress === 1 ? "" : "s"} ${onboardingsInProgress === 1 ? "is" : "are"} not finished (pending, in progress, or overdue). Complete tasks under Onboarding.`
      : null;

  await syncAttentionNotification({
    companyId,
    title: ONBOARDING_STAFF_IN_PROGRESS_NOTIFICATION_TITLE,
    message: onboardingMsg,
    linkUrl: "/dashboard/onboarding",
  });

  const perfMsg =
    performanceReviewsOpen > 0
      ? `${performanceReviewsOpen} performance review${performanceReviewsOpen === 1 ? "" : "s"} in the active cycle ${performanceReviewsOpen === 1 ? "is" : "are"} not completed yet. Open Performance to finish self- and manager steps.`
      : null;

  await syncAttentionNotification({
    companyId,
    title: PERFORMANCE_REVIEWS_ACTION_NOTIFICATION_TITLE,
    message: perfMsg,
    linkUrl: "/dashboard/performance",
  });

  const exitParts: string[] = [];
  if (exitRecordsInFlight > 0) {
    exitParts.push(
      `${exitRecordsInFlight} exit case${exitRecordsInFlight === 1 ? "" : "s"} in progress`,
    );
  }
  if (exitClearancePending > 0) {
    exitParts.push(
      `${exitClearancePending} clearance step${exitClearancePending === 1 ? "" : "s"} still pending`,
    );
  }
  const exitMessage =
    exitParts.length > 0 ? `${exitParts.join("; ")}. Open Exits to finish offboarding.` : null;

  await syncAttentionNotification({
    companyId,
    title: EXITS_ATTENTION_NOTIFICATION_TITLE,
    message: exitMessage,
    linkUrl: "/dashboard/exits",
  });

  const inviteMsg =
    pendingInvitations > 0
      ? `${pendingInvitations} team invitation${pendingInvitations === 1 ? "" : "s"} ${pendingInvitations === 1 ? "is" : "are"} still pending (not expired). Resend or track them under Settings → Team.`
      : null;

  await syncAttentionNotification({
    companyId,
    title: TEAM_INVITATIONS_PENDING_NOTIFICATION_TITLE,
    message: inviteMsg,
    linkUrl: "/dashboard/settings/team",
  });

  const pinMsg =
    pinResetsPending > 0
      ? `${pinResetsPending} employee${pinResetsPending === 1 ? "" : "s"} requested a portal PIN reset. Open Employees and help them set a new PIN from each profile.`
      : null;

  await syncAttentionNotification({
    companyId,
    title: PORTAL_PIN_RESETS_NOTIFICATION_TITLE,
    message: pinMsg,
    linkUrl: "/dashboard/employees",
  });
}
