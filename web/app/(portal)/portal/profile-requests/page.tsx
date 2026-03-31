"use client";

import { useState } from "react";
import { FileEdit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast/useToast";
import { useApi } from "@/lib/swr";

export default function PortalProfileRequestsPage() {
  const { toast } = useToast();
  const { data: rows, mutate } = useApi<{ id: string; status: string; changesJson: unknown }[]>(
    "/api/me/profile-change-requests",
  );
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hgh-gold/15 text-hgh-gold">
          <FileEdit size={22} aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-hgh-navy">Profile change requests</h1>
          <p className="mt-1 text-sm text-hgh-muted">
            Request updates to name, department, job title, or next-of-kin contact. HR approves before
            applying.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Proposed changes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder="Department (optional)"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
          <Input placeholder="Job title (optional)" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          <textarea
            className="w-full rounded-lg border border-hgh-border px-3 py-2 text-sm"
            rows={2}
            placeholder="Note to HR (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            type="button"
            disabled={busy || (!name.trim() && !department.trim() && !jobTitle.trim())}
            onClick={async () => {
              const changes: { field: string; proposedValue: string }[] = [];
              if (name.trim()) changes.push({ field: "name", proposedValue: name.trim() });
              if (department.trim()) changes.push({ field: "department", proposedValue: department.trim() });
              if (jobTitle.trim()) changes.push({ field: "jobTitle", proposedValue: jobTitle.trim() });
              setBusy(true);
              try {
                const res = await fetch("/api/me/profile-change-requests", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ changes, employeeNote: note.trim() || undefined }),
                });
                if (!res.ok) throw new Error();
                toast.success("Request submitted");
                setName("");
                setDepartment("");
                setJobTitle("");
                setNote("");
                mutate();
              } catch {
                toast.error("Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Sending…" : "Submit request"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">History</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-hgh-muted">
            {(rows ?? []).map((r) => (
              <li key={r.id}>
                {r.status} · <pre className="mt-1 inline-block text-xs">{JSON.stringify(r.changesJson)}</pre>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
