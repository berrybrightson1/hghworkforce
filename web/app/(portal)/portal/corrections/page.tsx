"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/lib/swr";

type Row = {
  id: string;
  reason: string;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  proposedClockIn: string | null;
  proposedClockOut: string | null;
  checkIn: { id: string; clockIn: string; clockOut: string | null };
};

const statusVariant = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
} as const;

export default function PortalCorrectionsPage() {
  const { data: rows, isLoading } = useApi<Row[]>("/api/me/attendance-corrections");

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hgh-gold/15 text-hgh-gold">
          <ClipboardList size={22} aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-hgh-navy">Attendance corrections</h1>
          <p className="mt-1 text-sm text-hgh-muted">
            Requests you submitted to fix times from your kiosk attendance record.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-24 animate-pulse rounded bg-hgh-offwhite" />
          ) : !rows || rows.length === 0 ? (
            <p className="text-sm text-hgh-muted">
              No requests yet. If a kiosk punch looks wrong, submit a request from{" "}
              <Link href="/portal/checkin" className="font-medium text-hgh-gold underline underline-offset-2 hover:text-hgh-gold/80">
                Attendance
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-hgh-border">
              {rows.map((r) => (
                <li key={r.id} className="py-4 first:pt-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm text-hgh-slate">{r.reason}</p>
                    <Badge variant={statusVariant[r.status as keyof typeof statusVariant] ?? "default"}>
                      {r.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-hgh-muted">
                    Recorded in: {new Date(r.checkIn.clockIn).toLocaleString()}
                    {r.checkIn.clockOut ? ` → ${new Date(r.checkIn.clockOut).toLocaleString()}` : ""}
                  </p>
                  {(r.proposedClockIn || r.proposedClockOut) ? (
                    <p className="mt-1 text-xs text-hgh-muted">
                      You proposed:{" "}
                      {r.proposedClockIn ? new Date(r.proposedClockIn).toLocaleString() : "—"}
                      {" · "}
                      {r.proposedClockOut ? new Date(r.proposedClockOut).toLocaleString() : "—"}
                    </p>
                  ) : null}
                  {r.reviewNote ? (
                    <p className="mt-2 text-xs text-hgh-slate">HR note: {r.reviewNote}</p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-hgh-muted">Submitted {new Date(r.createdAt).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
