import { describe, expect, it, vi, beforeEach } from "vitest";
import { PortalNotificationType } from "@prisma/client";

const { notifyEmployeeMock } = vi.hoisted(() => ({
  notifyEmployeeMock: vi.fn(),
}));

vi.mock("@/lib/portal-notify", () => ({
  notifyEmployee: notifyEmployeeMock,
}));

import { notifyEmployeeInApp } from "./notify";

describe("notifyEmployeeInApp", () => {
  beforeEach(() => {
    notifyEmployeeMock.mockReset();
  });

  it("delegates to notifyEmployee (in-app channel)", async () => {
    await notifyEmployeeInApp(
      "emp-1",
      "tenant-1",
      PortalNotificationType.GENERAL,
      "Hello",
      "World",
      "/portal",
    );
    expect(notifyEmployeeMock).toHaveBeenCalledWith(
      "emp-1",
      "tenant-1",
      PortalNotificationType.GENERAL,
      "Hello",
      "World",
      "/portal",
    );
  });
});
