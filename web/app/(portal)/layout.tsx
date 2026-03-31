import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EmployeeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureAppUser } from "@/lib/ensure-app-user";
import { createClient } from "@/lib/supabase/server";
import { CompanyProvider } from "@/components/company-context";
import { PortalShell } from "@/components/portal/portal-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const portalEmployeeId = h.get("x-hgh-portal-employee-id");
  const portalCompanyId = h.get("x-hgh-portal-company-id");

  if (portalEmployeeId && portalCompanyId) {
    const employee = await prisma.employee.findFirst({
      where: {
        id: portalEmployeeId,
        companyId: portalCompanyId,
        status: EmployeeStatus.ACTIVE,
        deletedAt: null,
        portalEnabled: true,
      },
      select: {
        name: true,
        employeeCode: true,
        department: true,
        company: { select: { id: true, name: true } },
      },
    });

    if (!employee) {
      redirect("/portal/login");
    }

    const displayName = employee.name?.trim() || employee.employeeCode;

    return (
      <CompanyProvider lockedCompany={{ id: employee.company.id, name: employee.company.name }}>
        <PortalShell
          authMode="portal"
          userEmail=""
          userDisplayName={displayName}
          employeeCode={employee.employeeCode}
          department={employee.department}
        >
          {children}
        </PortalShell>
      </CompanyProvider>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login?next=/portal");
  }

  const email = user.email ?? "";
  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    email ||
    "User";

  const dbUser = await ensureAppUser(user, displayName);

  if (dbUser.role !== "EMPLOYEE") {
    redirect("/dashboard");
  }

  if (!dbUser.companyId) {
    redirect("/onboarding");
  }

  const company = await prisma.company.findUnique({
    where: { id: dbUser.companyId },
    select: { id: true, name: true },
  });

  if (!company) {
    redirect("/onboarding");
  }

  const employee = await prisma.employee.findUnique({
    where: { userId: dbUser.id },
    select: { employeeCode: true, department: true, portalEnabled: true, status: true, deletedAt: true },
  });

  return (
    <CompanyProvider lockedCompany={{ id: company.id, name: company.name }}>
      <PortalShell
        authMode="supabase"
        userEmail={email}
        userDisplayName={displayName}
        employeeCode={employee?.employeeCode ?? ""}
        department={employee?.department ?? ""}
      >
        {children}
      </PortalShell>
    </CompanyProvider>
  );
}
