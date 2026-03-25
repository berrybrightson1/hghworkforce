import { NextResponse } from "next/server";
import { requireDbUser } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const { id, email, name, role, companyId } = auth.dbUser;
  return NextResponse.json({ id, email, name, role, companyId });
}
