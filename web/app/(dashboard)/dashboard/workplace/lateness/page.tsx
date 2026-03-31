"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { useApi } from "@/lib/swr";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function WorkplaceLatenessPage() {
  const { selected } = useCompany();
  const { toast } = useToast();
  const polUrl = selected ? `/api/companies/${selected.id}/lateness-policy` : null;
  const recUrl = selected ? `/api/companies/${selected.id}/late-records` : null;
  const empUrl = selected ? `/api/employees?companyId=${selected.id}` : null;
  const { data: policy, mutate: mutPol } = useApi<{
    graceMinutes: number;
    lateInstancesBeforeWarning: number | null;
    warningLetterBodyTemplate: string | null;
  }>(polUrl);
  const { data: records, mutate: mutRec } = useApi<
    {
      id: string;
      date: string;
      minutesLate: number;
      warningLetterSentAt: string | null;
      employee: { id: string; name: string | null; employeeCode: string };
    }[]
  >(recUrl);
  const { data: employees } = useApi<{ id: string; name: string | null; employeeCode: string }[]>(empUrl);
  const [empId, setEmpId] = useState("");
  const [mins, setMins] = useState("15");
  const [lateDate, setLateDate] = useState(new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-6">
      <Link href="/dashboard/workplace" className="inline-flex items-center gap-1 text-sm text-hgh-gold hover:underline">
        <ArrowLeft size={16} aria-hidden /> Workplace
      </Link>
      <h1 className="text-xl font-semibold text-hgh-navy">Lateness &amp; warning letters</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-hgh-muted">Grace minutes (reference)</label>
              <Input
                type="number"
                defaultValue={policy?.graceMinutes ?? 5}
                id="pol-grace"
              />
            </div>
            <div>
              <label className="text-xs text-hgh-muted">Suggest warning after N late instances (optional)</label>
              <Input
                type="number"
                defaultValue={policy?.lateInstancesBeforeWarning ?? ""}
                id="pol-warn"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-hgh-muted">Warning letter template (optional)</label>
            <textarea
              id="pol-tpl"
              className="mt-1 w-full rounded-lg border border-hgh-border px-3 py-2 text-sm"
              rows={4}
              defaultValue={policy?.warningLetterBodyTemplate ?? ""}
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={async () => {
              if (!selected) return;
              const res = await fetch(`/api/companies/${selected.id}/lateness-policy`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  graceMinutes: Number((document.getElementById("pol-grace") as HTMLInputElement).value),
                  lateInstancesBeforeWarning:
                    Number((document.getElementById("pol-warn") as HTMLInputElement).value) || null,
                  warningLetterBodyTemplate:
                    (document.getElementById("pol-tpl") as HTMLTextAreaElement).value || null,
                }),
              });
              if (res.ok) {
                mutPol();
                toast.success("Policy saved");
              } else toast.error("Failed");
            }}
          >
            Save policy
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record late incident</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3 text-sm">
          <div className="w-56">
            <label className="text-xs text-hgh-muted">Employee</label>
            <Select value={empId || undefined} onValueChange={setEmpId}>
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {(employees ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {(e.name || e.employeeCode).trim()} ({e.employeeCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-hgh-muted">Date</label>
            <Input type="date" value={lateDate} onChange={(e) => setLateDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-hgh-muted">Minutes late</label>
            <Input value={mins} onChange={(e) => setMins(e.target.value)} className="w-24" />
          </div>
          <Button
            type="button"
            onClick={async () => {
              if (!selected || !empId) return;
              const res = await fetch(`/api/companies/${selected.id}/late-records`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  employeeId: empId,
                  date: lateDate,
                  minutesLate: Number(mins),
                }),
              });
              if (res.ok) {
                mutRec();
                toast.success("Recorded");
              } else toast.error("Failed");
            }}
          >
            Add record
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent records</CardTitle>
        </CardHeader>
        <CardContent>
          {!records?.length ? (
            <p className="text-sm text-hgh-muted">None yet.</p>
          ) : (
            <ul className="divide-y divide-hgh-border text-sm">
              {records.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {(r.employee.name || r.employee.employeeCode).trim()} · {new Date(r.date).toLocaleDateString()}{" "}
                    · {r.minutesLate}m
                    {r.warningLetterSentAt ? " · letter sent" : ""}
                  </span>
                  {!r.warningLetterSentAt ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        if (!selected) return;
                        await fetch(`/api/companies/${selected.id}/late-records/${r.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ warningLetterSent: true }),
                        });
                        mutRec();
                      }}
                    >
                      Mark letter sent
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
