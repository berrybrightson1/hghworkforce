import { describe, expect, it, vi } from "vitest";

// Mock Prisma before importing the module under test
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import type { User } from "@prisma/client";
import {
  canAccessCompany,
  canAdminCompany,
  canHrDashboard,
  canManagePayroll,
  canApprovePayroll,
  canManageBilling,
  canViewBillingSummary,
  canManageLeave,
  canManageCheckinSecurity,
} from "./api-auth";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    authUserId: "auth-1",
    email: "test@example.com",
    name: "Test User",
    role: "EMPLOYEE",
    companyId: "comp-1",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe("canAccessCompany", () => {
  it("SUPER_ADMIN can access any company", () => {
    const user = makeUser({ role: "SUPER_ADMIN", companyId: "comp-1" });
    expect(canAccessCompany(user, "comp-other")).toBe(true);
  });

  it("COMPANY_ADMIN can access own company", () => {
    const user = makeUser({ role: "COMPANY_ADMIN", companyId: "comp-1" });
    expect(canAccessCompany(user, "comp-1")).toBe(true);
  });

  it("COMPANY_ADMIN cannot access other company", () => {
    const user = makeUser({ role: "COMPANY_ADMIN", companyId: "comp-1" });
    expect(canAccessCompany(user, "comp-other")).toBe(false);
  });

  it("user without companyId cannot access any company", () => {
    const user = makeUser({ role: "EMPLOYEE", companyId: null });
    expect(canAccessCompany(user, "comp-1")).toBe(false);
  });

  it("EMPLOYEE can access own company", () => {
    const user = makeUser({ role: "EMPLOYEE", companyId: "comp-1" });
    expect(canAccessCompany(user, "comp-1")).toBe(true);
  });
});

describe("role-based permission helpers", () => {
  describe("canAdminCompany", () => {
    it.each([
      ["SUPER_ADMIN", true],
      ["COMPANY_ADMIN", true],
      ["HR", false],
      ["EMPLOYEE", false],
    ] as const)("%s → %s", (role, expected) => {
      expect(canAdminCompany(role)).toBe(expected);
    });
  });

  describe("canHrDashboard", () => {
    it.each([
      ["SUPER_ADMIN", true],
      ["COMPANY_ADMIN", true],
      ["HR", true],
      ["EMPLOYEE", false],
    ] as const)("%s → %s", (role, expected) => {
      expect(canHrDashboard(role)).toBe(expected);
    });
  });

  describe("canManagePayroll", () => {
    it.each([
      ["SUPER_ADMIN", true],
      ["COMPANY_ADMIN", true],
      ["HR", true],
      ["EMPLOYEE", false],
    ] as const)("%s → %s", (role, expected) => {
      expect(canManagePayroll(role)).toBe(expected);
    });
  });

  describe("canApprovePayroll", () => {
    it.each([
      ["SUPER_ADMIN", true],
      ["COMPANY_ADMIN", true],
      ["HR", false],
      ["EMPLOYEE", false],
    ] as const)("%s → %s", (role, expected) => {
      expect(canApprovePayroll(role)).toBe(expected);
    });
  });

  describe("canManageLeave", () => {
    it.each([
      ["SUPER_ADMIN", true],
      ["COMPANY_ADMIN", true],
      ["HR", true],
      ["EMPLOYEE", false],
    ] as const)("%s → %s", (role, expected) => {
      expect(canManageLeave(role)).toBe(expected);
    });
  });

  describe("canManageBilling", () => {
    it.each([
      ["SUPER_ADMIN", true],
      ["COMPANY_ADMIN", true],
      ["HR", false],
      ["EMPLOYEE", false],
    ] as const)("%s → %s", (role, expected) => {
      expect(canManageBilling(role)).toBe(expected);
    });
  });

  describe("canViewBillingSummary", () => {
    it.each([
      ["SUPER_ADMIN", true],
      ["COMPANY_ADMIN", true],
      ["HR", true],
      ["EMPLOYEE", false],
    ] as const)("%s → %s", (role, expected) => {
      expect(canViewBillingSummary(role)).toBe(expected);
    });
  });

  describe("canManageCheckinSecurity", () => {
    it.each([
      ["SUPER_ADMIN", true],
      ["COMPANY_ADMIN", true],
      ["HR", false],
      ["EMPLOYEE", false],
    ] as const)("%s → %s", (role, expected) => {
      expect(canManageCheckinSecurity(role)).toBe(expected);
    });
  });
});
