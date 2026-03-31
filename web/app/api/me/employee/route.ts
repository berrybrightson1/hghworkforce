import { NextResponse } from "next/server";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";

/** Current employee profile for portal / self-service forms (no admin listing). */
export async function GET() {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;

  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  const e = self.employee;
  return NextResponse.json({
    id: e.id,
    companyId: e.companyId,
    employeeCode: e.employeeCode,
    name: e.name,
    department: e.department,
    jobTitle: e.jobTitle,
  });
}
