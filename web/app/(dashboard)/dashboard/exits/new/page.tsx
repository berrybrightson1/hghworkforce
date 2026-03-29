"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerField } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EXIT_TYPES = [
  { value: "RESIGNATION", label: "Resignation" },
  { value: "TERMINATION", label: "Termination" },
  { value: "REDUNDANCY", label: "Redundancy" },
  { value: "RETIREMENT", label: "Retirement" },
  { value: "CONTRACT_END", label: "Contract end" },
  { value: "DEATH", label: "Death" },
] as const;

type Emp = {
  id: string;
  name: string | null;
  employeeCode: string;
  department: string;
};

function NewExitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selected } = useCompany();
  const { toast } = useToast();

  const [employees, setEmployees] = useState<Emp[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [exitType, setExitType] = useState<string>("RESIGNATION");
  const [noticeDate, setNoticeDate] = useState("");
  const [lastWorkingDay, setLastWorkingDay] = useState("");
  const [exitInterviewDate, setExitInterviewDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const pre = searchParams.get("employeeId");
    if (pre) setEmployeeId(pre);
  }, [searchParams]);

  useEffect(() => {
    if (!selected?.id) return;
    (async () => {
      const res = await fetch(
        `/api/employees?companyId=${selected.id}&status=ACTIVE`,
      );
      if (res.ok) {
        const data = (await res.json()) as Emp[];
        setEmployees(data);
      }
    })();
  }, [selected?.id]);

  const handleCreate = async () => {
    if (!selected || !employeeId || !noticeDate || !lastWorkingDay) {
      toast.error("Employee and dates are required");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/exits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: selected.id,
        employeeId,
        exitType,
        noticeDate,
        lastWorkingDay,
        exitInterviewDate: exitInterviewDate || null,
        reason: reason.trim() || null,
        seedClearance: true,
      }),
    });
    setSaving(false);

    if (res.ok) {
      const created = (await res.json()) as { id: string };
      toast.success("Exit case created");
      router.push(`/dashboard/exits/${created.id}`);
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to create exit case");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/exits")}>
          <ArrowLeft size={18} />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">New exit case</h2>
          <p className="text-sm text-hgh-muted">
            Record offboarding details; a default clearance checklist will be added.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-hgh-slate">Employee</label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name ?? e.employeeCode} ({e.employeeCode}) — {e.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-hgh-slate">Exit type</label>
            <Select value={exitType} onValueChange={setExitType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXIT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-slate">Notice date</label>
              <DatePickerField value={noticeDate} onChange={setNoticeDate} placeholder="Notice date" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-slate">Last working day</label>
              <DatePickerField
                value={lastWorkingDay}
                onChange={setLastWorkingDay}
                placeholder="Last day"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-hgh-slate">
              Exit interview (optional)
            </label>
            <DatePickerField
              value={exitInterviewDate}
              onChange={setExitInterviewDate}
              placeholder="Interview date"
              allowClear
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-hgh-slate">Reason (optional)</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Notes" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => router.push("/dashboard/exits")}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={saving}>
          {saving ? "Saving..." : "Create exit case"}
        </Button>
      </div>
    </div>
  );
}

export default function NewExitPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-sm text-hgh-muted">Loading…</div>}
    >
      <NewExitPageContent />
    </Suspense>
  );
}
