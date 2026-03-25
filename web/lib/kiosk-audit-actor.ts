import { prisma } from "@/lib/prisma";

/** Prefer a stable admin user for kiosk-related audit rows when the actor is not logged in. */
export async function getKioskAuditActorId(companyId: string): Promise<string | null> {
  const u = await prisma.user.findFirst({
    where: {
      companyId,
      isActive: true,
      role: { in: ["COMPANY_ADMIN", "HR"] },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return u?.id ?? null;
}
