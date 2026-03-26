import { describe, expect, it, vi } from "vitest";

// Mock modules that pull in Prisma
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import type { Company } from "@prisma/client";
import { guardCompanyFullAccess } from "./guards";

function makeCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: "comp-1",
    name: "Test Corp",
    subscriptionStatus: "ACTIVE",
    trialEndsAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tier2PensionEnabled: false,
    tier2EmployeePercent: null,
    tier2EmployerPercent: null,
    kioskOfficeOpensAt: null,
    kioskOfficeClosesAt: null,
    kioskCutoffTime: null,
    kioskTimezone: null,
    ...overrides,
  } as Company;
}

describe("guardCompanyFullAccess", () => {
  it("returns null (allow) for SUPER_ADMIN regardless of subscription", () => {
    const c = makeCompany({ subscriptionStatus: "CANCELLED", trialEndsAt: new Date(0) });
    expect(guardCompanyFullAccess(c, "SUPER_ADMIN")).toBeNull();
  });

  it("returns null (allow) when company has active subscription", () => {
    const c = makeCompany({ subscriptionStatus: "ACTIVE" });
    expect(guardCompanyFullAccess(c, "COMPANY_ADMIN")).toBeNull();
  });

  it("returns null (allow) during trial window", () => {
    const future = new Date(Date.now() + 86_400_000);
    const c = makeCompany({ subscriptionStatus: "TRIALING", trialEndsAt: future });
    expect(guardCompanyFullAccess(c, "HR")).toBeNull();
  });

  it("returns 402 response when trial expired and no subscription", () => {
    const past = new Date(Date.now() - 86_400_000);
    const c = makeCompany({ subscriptionStatus: "TRIALING", trialEndsAt: past });
    const result = guardCompanyFullAccess(c, "COMPANY_ADMIN");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(402);
  });

  it("returns 402 for EMPLOYEE role when access is blocked", () => {
    const past = new Date(Date.now() - 86_400_000);
    const c = makeCompany({ subscriptionStatus: "CANCELLED", trialEndsAt: past });
    const result = guardCompanyFullAccess(c, "EMPLOYEE");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(402);
  });
});
