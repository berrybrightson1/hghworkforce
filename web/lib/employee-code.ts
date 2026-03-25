import type { Prisma } from "@prisma/client";

function companyPrefix(companyName: string | null | undefined): string {
  const raw = (companyName ?? "CO").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return raw.slice(0, 4) || "EMP";
}

/**
 * Globally unique employee code: PREFIX + company id fragment + sequential padding.
 * Runs inside a transaction with the same DB client used for create.
 */
export async function allocateEmployeeCode(
  tx: Prisma.TransactionClient,
  companyId: string,
  companyName: string | null | undefined,
): Promise<string> {
  const prefix = companyPrefix(companyName);
  const idPart = companyId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() || "XXXXXX";
  const count = await tx.employee.count({
    where: { companyId, deletedAt: null },
  });
  let seq = count + 1;
  for (let attempt = 0; attempt < 500; attempt++) {
    const code = `${prefix}-${idPart}-${String(seq).padStart(4, "0")}`;
    const clash = await tx.employee.findUnique({
      where: { employeeCode: code },
    });
    if (!clash) return code;
    seq++;
  }
  throw new Error("Could not allocate unique employee code");
}
