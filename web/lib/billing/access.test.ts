import { describe, expect, it } from "vitest";
import {
  companyHasFullAccess,
  effectiveTrialEndsAt,
  isSubscriptionActive,
  TRIAL_DAYS,
  type CompanyBillingFields,
} from "./access";

function makeCompany(
  overrides: Partial<CompanyBillingFields> = {},
): CompanyBillingFields {
  return {
    subscriptionStatus: "TRIALING",
    trialEndsAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("billing/access", () => {
  describe("effectiveTrialEndsAt", () => {
    it("uses trialEndsAt when set", () => {
      const explicit = new Date("2026-04-01T00:00:00Z");
      const c = makeCompany({ trialEndsAt: explicit });
      expect(effectiveTrialEndsAt(c)).toEqual(explicit);
    });

    it("falls back to createdAt + TRIAL_DAYS when trialEndsAt is null", () => {
      const created = new Date("2026-03-20T00:00:00Z");
      const c = makeCompany({ createdAt: created, trialEndsAt: null });
      const result = effectiveTrialEndsAt(c);
      const expected = new Date("2026-03-20T00:00:00Z");
      expected.setDate(expected.getDate() + TRIAL_DAYS);
      expect(result.getTime()).toBe(expected.getTime());
    });
  });

  describe("isSubscriptionActive", () => {
    it("returns true for ACTIVE", () => {
      expect(isSubscriptionActive(makeCompany({ subscriptionStatus: "ACTIVE" }))).toBe(true);
    });

    it("returns false for TRIALING", () => {
      expect(isSubscriptionActive(makeCompany({ subscriptionStatus: "TRIALING" }))).toBe(false);
    });

    it("returns false for CANCELLED", () => {
      expect(isSubscriptionActive(makeCompany({ subscriptionStatus: "CANCELLED" }))).toBe(false);
    });
  });

  describe("companyHasFullAccess", () => {
    it("grants access with ACTIVE subscription", () => {
      const c = makeCompany({ subscriptionStatus: "ACTIVE" });
      expect(companyHasFullAccess(c)).toBe(true);
    });

    it("grants access during trial window", () => {
      const future = new Date(Date.now() + 86_400_000);
      const c = makeCompany({ trialEndsAt: future });
      expect(companyHasFullAccess(c)).toBe(true);
    });

    it("denies access after trial expires without subscription", () => {
      const past = new Date(Date.now() - 86_400_000);
      const c = makeCompany({ trialEndsAt: past, subscriptionStatus: "TRIALING" });
      expect(companyHasFullAccess(c)).toBe(false);
    });

    it("grants access with ACTIVE subscription even after trial expiry", () => {
      const past = new Date(Date.now() - 86_400_000);
      const c = makeCompany({ trialEndsAt: past, subscriptionStatus: "ACTIVE" });
      expect(companyHasFullAccess(c)).toBe(true);
    });

    it("grants access during referralAccessUntil even after trial expires", () => {
      const past = new Date(Date.now() - 86_400_000);
      const future = new Date(Date.now() + 86_400_000 * 10);
      const c = makeCompany({
        trialEndsAt: past,
        subscriptionStatus: "NONE",
        referralAccessUntil: future,
      });
      expect(companyHasFullAccess(c)).toBe(true);
    });
  });
});
