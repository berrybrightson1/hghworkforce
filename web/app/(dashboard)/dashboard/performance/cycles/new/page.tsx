"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerField } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewCyclePage() {
  const router = useRouter();
  const { selected } = useCompany();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!selected || !name.trim() || !periodStart || !periodEnd) {
      toast.error("All fields are required");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/performance/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: selected.id,
        name: name.trim(),
        periodStart,
        periodEnd,
      }),
    });
    setSaving(false);

    if (res.ok) {
      toast.success("Cycle created");
      router.push("/dashboard/performance");
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to create cycle");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/performance")}>
          <ArrowLeft size={18} />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">New Performance Cycle</h2>
          <p className="text-sm text-hgh-muted">
            Create a review cycle, then activate it to generate reviews for all employees.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cycle Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-hgh-slate">Cycle Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "Q1 2025"'
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-slate">Period Start</label>
              <DatePickerField value={periodStart} onChange={setPeriodStart} placeholder="Start" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-slate">Period End</label>
              <DatePickerField value={periodEnd} onChange={setPeriodEnd} placeholder="End" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => router.push("/dashboard/performance")}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={saving}>
          {saving ? "Creating..." : "Create Cycle"}
        </Button>
      </div>
    </div>
  );
}
