import { NextResponse } from "next/server";
import { buildDashboardGreetingName } from "@/lib/greeting-name";
import { requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const full = await prisma.user.findUnique({
    where: { id: auth.dbUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      role: true,
      companyId: true,
      referralCode: true,
    },
  });

  if (!full) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const referralCount = await prisma.referralReward.count({
    where: { referrerId: full.id },
  });

  const greetingName = buildDashboardGreetingName({
    firstName: full.firstName,
    lastName: full.lastName,
    legacyName: full.name,
    email: full.email,
  });

  return NextResponse.json({
    id: full.id,
    email: full.email,
    name: full.name,
    firstName: full.firstName,
    lastName: full.lastName,
    greetingName,
    role: full.role,
    companyId: full.companyId,
    referralCode: full.referralCode,
    referralCount,
    referralMonthsEarned: referralCount,
  });
}
