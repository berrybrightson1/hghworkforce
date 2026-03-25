import { NextResponse } from "next/server";
import { requireDbUser, canAccessCompany } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/users?companyId=xxx
 * Lists users for a company. SUPER_ADMIN sees all, COMPANY_ADMIN sees own company.
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

  // SUPER_ADMIN with no companyId filter gets all users
  const where = companyId ? { companyId } : {};

  if (companyId && !canAccessCompany(dbUser, companyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      companyId: true,
      createdAt: true,
      company: { select: { name: true } },
    },
  });

  return NextResponse.json(users);
}

/**
 * PATCH /api/users
 * Body: { userId: string, role?: UserRole, isActive?: boolean, companyId?: string }
 * Update a user's role, status, or company assignment.
 */
export async function PATCH(req: Request) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const { dbUser } = auth;
  if (dbUser.role !== "SUPER_ADMIN" && dbUser.role !== "COMPANY_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, role, isActive, companyId } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Cannot modify yourself
  if (userId === dbUser.id) {
    return NextResponse.json({ error: "Cannot modify your own account" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // COMPANY_ADMIN can only manage users in their own company
  if (dbUser.role === "COMPANY_ADMIN") {
    if (targetUser.companyId !== dbUser.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // COMPANY_ADMIN cannot promote to SUPER_ADMIN or COMPANY_ADMIN
    if (role === "SUPER_ADMIN" || role === "COMPANY_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Admins can assign admin roles" },
        { status: 403 },
      );
    }
  }

  // Nobody can demote a SUPER_ADMIN except another SUPER_ADMIN
  if (targetUser.role === "SUPER_ADMIN" && dbUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Cannot modify a Super Admin" }, { status: 403 });
  }

  // Only SUPER_ADMIN can promote to SUPER_ADMIN
  if (role === "SUPER_ADMIN" && dbUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Super Admins can grant Super Admin role" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (role !== undefined) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;
  if (companyId !== undefined) data.companyId = companyId;

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      companyId: true,
      company: { select: { name: true } },
    },
  });

  return NextResponse.json(updated);
}
