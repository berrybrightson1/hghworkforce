"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast/useToast";
import { useApi } from "@/lib/swr";

type Row = { id: string; subject: string; body: string; status: string; responseBody: string | null };

export default function PortalPayQueriesPage() {
  const { toast } = useToast();
  const { data: rows, mutate } = useApi<Row[]>("/api/me/pay-queries");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hgh-gold/15 text-hgh-gold">
          <HelpCircle size={22} aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-hgh-navy">Pay queries</h1>
          <p className="mt-1 text-sm text-hgh-muted">Ask about payslips, deductions, or payroll timing.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New query</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea
            className="w-full rounded-lg border border-hgh-border px-3 py-2 text-sm"
            rows={4}
            placeholder="Describe your question"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button
            type="button"
            disabled={busy || !subject.trim() || body.trim().length < 5}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await fetch("/api/me/pay-queries", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
                });
                if (!res.ok) throw new Error();
                toast.success("Submitted");
                setSubject("");
                setBody("");
                mutate();
              } catch {
                toast.error("Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Sending…" : "Submit"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your threads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {(rows ?? []).map((r) => (
            <div key={r.id} className="rounded-lg border border-hgh-border p-3">
              <p className="font-medium text-hgh-navy">{r.subject}</p>
              <p className="text-xs text-hgh-muted">{r.status}</p>
              <p className="mt-1 whitespace-pre-wrap">{r.body}</p>
              {r.responseBody ? (
                <p className="mt-2 text-hgh-slate">
                  <span className="font-medium">Response: </span>
                  {r.responseBody}
                </p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
