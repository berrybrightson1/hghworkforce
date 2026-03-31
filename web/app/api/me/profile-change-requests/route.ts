import { NextResponse } from "next/server";
import { ProfileChangeRequestStatus } from "@prisma/client";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type ChangeItem = { field: string; proposedValue: string };

const ALLOWED = new Set(["name", "department", "jobTitle", "nokName", "nokPhone", "nokRelationship"]);

export async function GET() {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;
  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  const rows = await prisma.profileChangeRequest.findMany({
    where: { employeeId: self.employee.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;
  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  let body: { changes?: ChangeItem[]; employeeNote?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const changes = Array.isArray(body.changes) ? body.changes : [];
  const normalized: ChangeItem[] = [];
  for (const c of changes) {
    if (!c?.field || typeof c.proposedValue !== "string") continue;
    if (!ALLOWED.has(c.field)) continue;
    normalized.push({ field: c.field, proposedValue: c.proposedValue.trim() });
  }
  if (normalized.length === 0) {
    return NextResponse.json({ error: "No valid changes" }, { status: 400 });
  }

  const row = await prisma.profileChangeRequest.create({
    data: {
      companyId: self.employee.companyId,
      employeeId: self.employee.id,
      changesJson: normalized,
      employeeNote: body.employeeNote?.trim() || null,
      status: ProfileChangeRequestStatus.PENDING,
    },
  });
  return NextResponse.json(row, { status: 201 });
}
