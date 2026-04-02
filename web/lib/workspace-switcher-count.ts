import { UserRole, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Number of organisations shown in the dashboard company switcher for this user
 * (mirrors GET /api/companies visibility).
 */
export async function getWorkspaceSwitcherCountForUser(dbUser: User): Promise<number> {
  if (dbUser.role === UserRole.SUPER_ADMIN) {
    return prisma.company.count();
  }
  if (dbUser.role === UserRole.COMPANY_ADMIN || dbUser.role === UserRole.HR) {
    if (!dbUser.companyId) return 0;
    const exists = await prisma.company.findUnique({
      where: { id: dbUser.companyId },
      select: { id: true },
    });
    return exists ? 1 : 0;
  }
  if (dbUser.companyId) {
    const exists = await prisma.company.findUnique({
      where: { id: dbUser.companyId },
      select: { id: true },
    });
    return exists ? 1 : 0;
  }
  return 0;
}
