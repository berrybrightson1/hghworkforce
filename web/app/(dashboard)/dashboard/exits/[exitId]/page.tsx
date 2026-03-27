"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useApi } from "@/lib/swr";
import { useToast } from "@/components/toast/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClearanceItem = {
  id: string;
  department: string;
  item: string;
  status: string;
  note: string | null;
  clearedAt: string | null;
};

type ExitDetail = {
  id: string;
  status: string;
  exitType: string;
  noticeDate: string;
  lastWorkingDay: string;
  exitInterviewDate: string | null;
  reason: string | null;
  finalPayrunId: string | null;
  employee: {
    id: string;
    name: string | null;
    employeeCode: string;
    department: string;
    jobTitle: string;
    status: string;
    user: { email: string; name: string | null } | null;
  };
  clearanceItems: ClearanceItem[];
};

const STATUSES = ["INITIATED", "IN_PROGRESS", "CLEARED", "COMPLETED"] as const;
const ITEM_STATUSES = ["PENDING", "CLEARED", "WAIVED"] as const;

export default function ExitDetailPage() {
  const params = useParams();
  const exitId = typeof params.exitId === "string" ? params.exitId : null;
  const router = useRouter();
  const { toast } = useToast();
  const { data, mutate } = useApi<ExitDetail>(exitId ? `/api/exits/${exitId}` : null);

  const [savingCase, setSavingCase] = useState(false);
  const [finalPayrunId, setFinalPayrunId] = useState("");
  const [syncTerminate, setSyncTerminate] = useState(false);

  useEffect(() => {
    setFinalPayrunId(data?.finalPayrunId ?? "");
  }, [data?.finalPayrunId]);

  const saveCaseFields = useCallback(async () => {
    if (!exitId || !data) return;
    setSavingCase(true);
    const res = await fetch(`/api/exits/${exitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        finalPayrunId: finalPayrunId.trim() || null,
      }),
    });
    setSavingCase(false);
    if (res.ok) {
      toast.success("Saved");
      mutate();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
    }
  }, [exitId, data, finalPayrunId, mutate, toast]);

  const setCaseStatus = async (status: string) => {
    if (!exitId) return;
    const res = await fetch(`/api/exits/${exitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        ...(status === "COMPLETED" && syncTerminate ? { syncEmployeeTerminated: true } : {}),
      }),
    });
    if (res.ok) {
      toast.success("Status updated");
      mutate();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
    }
  };

  const updateClearance = async (itemId: string, status: string) => {
    if (!exitId) return;
    const res = await fetch(`/api/exits/${exitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-clearance-item",
        itemId,
        status,
      }),
    });
    if (res.ok) {
      toast.success("Clearance updated");
      mutate();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
    }
  };

  if (!data) {
    return (
      <div className="space-y-3 py-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-hgh-border/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/exits")}>
          <ArrowLeft size={18} />
          Back
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-hgh-navy">
            Exit · {data.employee.name ?? data.employee.employeeCode}
          </h2>
          <p className="text-sm text-hgh-muted">
            {data.exitType.replace(/_/g, " ")} · Last day{" "}
            {new Date(data.lastWorkingDay).toLocaleDateString("en-GH")}
          </p>
        </div>
        <Badge>{data.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-hgh-slate">
          <p>
            <span className="font-medium text-hgh-navy">{data.employee.employeeCode}</span> ·{" "}
            {data.employee.department} · {data.employee.jobTitle}
          </p>
          {data.employee.user?.email && (
            <p className="mt-1 text-hgh-muted">{data.employee.user.email}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Case status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-hgh-muted">Set status:</span>
            <Select value={data.status} onValueChange={setCaseStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-hgh-slate">
            <input
              type="checkbox"
              checked={syncTerminate}
              onChange={(e) => setSyncTerminate(e.target.checked)}
            />
            When marking <strong>COMPLETED</strong>, set employee to terminated (soft-delete record)
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-slate">
                Final pay run ID (optional)
              </label>
              <Input
                className="w-64"
                value={finalPayrunId}
                placeholder="Pay run id"
                onChange={(e) => setFinalPayrunId(e.target.value)}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={saveCaseFields} disabled={savingCase}>
              Save pay run link
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clearance checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-hgh-border text-left text-xs text-hgh-muted">
                  <th className="py-2 pr-4">Dept</th>
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hgh-border">
                {data.clearanceItems.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 pr-4 text-hgh-navy">{c.department}</td>
                    <td className="py-2 pr-4 text-hgh-slate">{c.item}</td>
                    <td className="py-2">
                      <Select value={c.status} onValueChange={(v) => updateClearance(c.id, v)}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEM_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
