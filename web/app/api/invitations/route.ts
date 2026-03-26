import { NextResponse } from "next/server";
import { requireDbUser, gateCompanyBilling } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/invite-code";

/**
 * GET /api/invitations?companyId=xxx
 * Lists invitations for a company. SUPER_ADMIN or COMPANY_ADMIN only.
 */
export async function GET(req: Request) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const { dbUser } = auth;
  if (dbUser.role !== "SUPER_ADMIN" && dbUser.role !== "COMPANY_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId") ?? dbUser.companyId;

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const getInvBill = await gateCompanyBilling(dbUser, companyId);
  if (getInvBill) return getInvBill;

  const invitations = await prisma.invitation.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { name: true } },
      inviter: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(invitations);
}

/**
 * POST /api/invitations
 * Body: { email: string, role: UserRole, companyId: string }
 * Creates a new invitation. SUPER_ADMIN or COMPANY_ADMIN only.
 */
export async function POST(req: Request) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const { dbUser } = auth;
  if (dbUser.role !== "SUPER_ADMIN" && dbUser.role !== "COMPANY_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { email, role, companyId } = body;

  if (!email || !role || !companyId) {
    return NextResponse.json(
      { error: "email, role, and companyId are required" },
      { status: 400 },
    );
  }

  // Validate role - cannot invite SUPER_ADMIN
  const validRoles = ["COMPANY_ADMIN", "HR", "EMPLOYEE"];
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { error: "Invalid role. Must be COMPANY_ADMIN, HR, or EMPLOYEE" },
      { status: 400 },
    );
  }

  const postInvBilling = await gateCompanyBilling(dbUser, companyId);
  if (postInvBilling) return postInvBilling;

  // COMPANY_ADMIN cannot invite other COMPANY_ADMINs
  if (dbUser.role === "COMPANY_ADMIN" && role === "COMPANY_ADMIN") {
    return NextResponse.json(
      { error: "Only Super Admins can invite Company Admins" },
      { status: 403 },
    );
  }

  // Check if there's already a pending invite for this email + company
  const existing = await prisma.invitation.findFirst({
    where: {
      email,
      companyId,
      status: "PENDING",
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A pending invitation already exists for this email" },
      { status: 409 },
    );
  }

  const code = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

  const invitation = await prisma.invitation.create({
    data: {
      email,
      role,
      companyId,
      code,
      invitedBy: dbUser.id,
      expiresAt,
    },
    include: {
      company: { select: { name: true } },
    },
  });

  return NextResponse.json(invitation, { status: 201 });
}

/**
 * PATCH /api/invitations
 * Body: { id: string, action: "revoke" }
 * Revokes a pending invitation.
 */
export async function PATCH(req: Request) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const { dbUser } = auth;
  if (dbUser.role !== "SUPER_ADMIN" && dbUser.role !== "COMPANY_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, action } = body;

  if (action !== "revoke" || !id) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({ where: { id } });

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  const patchBilling = await gateCompanyBilling(dbUser, invitation.companyId);
  if (patchBilling) return patchBilling;

  if (invitation.status !== "PENDING") {
    return NextResponse.json({ error: "Can only revoke pending invitations" }, { status: 400 });
  }

  const updated = await prisma.invitation.update({
    where: { id },
    data: { status: "REVOKED" },
  });

  return NextResponse.json(updated);
}
