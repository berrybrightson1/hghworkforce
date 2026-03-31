"use client";

import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/lib/swr";

type Assignment = {
  id: string;
  startDate: string;
  shift: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    status: string;
  };
};

export default function PortalSchedulePage() {
  const { data: assignments, isLoading } = useApi<Assignment[]>("/api/me/shifts");

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hgh-gold/15 text-hgh-gold">
          <Clock size={22} aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-hgh-navy">Schedule</h1>
          <p className="mt-1 text-sm text-hgh-muted">Shift assignments currently in effect.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My shifts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-24 animate-pulse rounded bg-hgh-offwhite" />
          ) : !assignments || assignments.length === 0 ? (
            <p className="text-sm text-hgh-muted">No active shift assignment. Your manager sets this in the dashboard.</p>
          ) : (
            <ul className="space-y-4">
              {assignments.map((a) => (
                <li key={a.id} className="rounded-lg border border-hgh-border bg-white px-4 py-3">
                  <p className="font-semibold text-hgh-navy">{a.shift.name}</p>
                  <p className="mt-1 text-sm text-hgh-slate">
                    {a.shift.startTime} – {a.shift.endTime} (break {a.shift.breakMinutes} min)
                  </p>
                  <p className="mt-1 text-xs text-hgh-muted">
                    Since {new Date(a.startDate).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
