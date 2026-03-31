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
import { cn } from "@/lib/utils";

type Tab = "notices" | "feedback" | "queries" | "profile";

export default function WorkplaceCommsPage() {
  const { selected } = useCompany();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("notices");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<Record<string, string>>({});

  const noticesUrl = selected ? `/api/companies/${selected.id}/notices` : null;
  const fbUrl = selected ? `/api/companies/${selected.id}/anonymous-feedback` : null;
  const pqUrl = selected ? `/api/companies/${selected.id}/pay-queries` : null;
  const prUrl = selected ? `/api/companies/${selected.id}/profile-change-requests` : null;

  const { data: notices, mutate: mutN } = useApi<
    { id: string; title: string; publishedAt: string; createdBy: { name: string } }[]
  >(noticesUrl);
  const { data: feedback, mutate: mutF } = useApi<
    { id: string; message: string; status: string; createdAt: string }[]
  >(fbUrl);
  const { data: queries, mutate: mutQ } = useApi<
    {
      id: string;
      subject: string;
      status: string;
      body: string;
      responseBody: string | null;
      employee: { name: string | null; employeeCode: string };
    }[]
  >(pqUrl);
  const { data: profiles, mutate: mutP } = useApi<
    {
      id: string;
      status: string;
      changesJson: unknown;
      employeeNote: string | null;
      employee: { name: string | null; employeeCode: string };
    }[]
  >(prUrl);

  const tabs: { id: Tab; label: string }[] = [
    { id: "notices", label: "Notices" },
    { id: "feedback", label: "Anonymous" },
    { id: "queries", label: "Pay queries" },
    { id: "profile", label: "Profile requests" },
  ];

  return (
    <div className="space-y-6">
      <Link href="/dashboard/workplace" className="inline-flex items-center gap-1 text-sm text-hgh-gold hover:underline">
        <ArrowLeft size={16} aria-hidden /> Workplace
      </Link>
      <h1 className="text-xl font-semibold text-hgh-navy">Communications</h1>

      <div className="flex flex-wrap gap-1 border-b border-hgh-border pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              tab === t.id ? "bg-hgh-navy text-white" : "text-hgh-muted hover:bg-hgh-offwhite",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "notices" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publish notice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea
              className="w-full rounded-lg border border-hgh-border px-3 py-2 text-sm"
              rows={4}
              placeholder="Body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button
              type="button"
              onClick={async () => {
                if (!selected || !title.trim() || !body.trim()) return;
                const res = await fetch(`/api/companies/${selected.id}/notices`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title: title.trim(), body: body.trim(), notifyEmployees: true }),
                });
                if (res.ok) {
                  toast.success("Published");
                  setTitle("");
                  setBody("");
                  mutN();
                } else toast.error("Failed");
              }}
            >
              Publish &amp; notify
            </Button>
            <div className="border-t border-hgh-border pt-4">
              <p className="text-sm font-medium text-hgh-navy">Recent</p>
              <ul className="mt-2 space-y-2 text-sm text-hgh-muted">
                {(notices ?? []).map((n) => (
                  <li key={n.id}>
                    {n.title} · {new Date(n.publishedAt).toLocaleDateString()} · {n.createdBy.name}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "feedback" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anonymous feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-hgh-border text-sm">
              {(feedback ?? []).map((f) => (
                <li key={f.id} className="py-3">
                  <p className="text-hgh-navy">{f.message}</p>
                  <p className="text-xs text-hgh-muted">
                    {f.status} · {new Date(f.createdAt).toLocaleString()}
                  </p>
                  {f.status === "NEW" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      onClick={async () => {
                        await fetch(`/api/companies/${selected!.id}/anonymous-feedback/${f.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "REVIEWED" }),
                        });
                        mutF();
                      }}
                    >
                      Mark reviewed
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {tab === "queries" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pay queries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {(queries ?? []).map((q) => (
              <div key={q.id} className="rounded-lg border border-hgh-border p-3">
                <p className="font-medium text-hgh-navy">
                  {q.subject} · {(q.employee.name || q.employee.employeeCode).trim()}
                </p>
                <p className="mt-1 text-hgh-muted">{q.status}</p>
                <p className="mt-2 whitespace-pre-wrap">{q.body}</p>
                {q.responseBody ? (
                  <p className="mt-2 text-xs text-hgh-slate">Reply: {q.responseBody}</p>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder="Response to employee"
                      value={reply[q.id] ?? ""}
                      onChange={(e) => setReply((r) => ({ ...r, [q.id]: e.target.value }))}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        const text = reply[q.id]?.trim();
                        if (!text) return;
                        await fetch(`/api/pay-queries/${q.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ responseBody: text, status: "RESOLVED" }),
                        });
                        mutQ();
                      }}
                    >
                      Send
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === "profile" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile change requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {(profiles ?? [])
              .filter((p) => p.status === "PENDING")
              .map((p) => (
                <div key={p.id} className="rounded-lg border border-hgh-border p-3">
                  <p className="font-medium text-hgh-navy">
                    {(p.employee.name || p.employee.employeeCode).trim()}
                  </p>
                  <pre className="mt-2 max-h-32 overflow-auto rounded bg-hgh-offwhite p-2 text-xs">
                    {JSON.stringify(p.changesJson, null, 2)}
                  </pre>
                  {p.employeeNote ? <p className="mt-1 text-hgh-muted">Note: {p.employeeNote}</p> : null}
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        await fetch(
                          `/api/companies/${selected!.id}/profile-change-requests/${p.id}`,
                          {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "APPROVED" }),
                          },
                        );
                        mutP();
                        toast.success("Approved & applied");
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        await fetch(
                          `/api/companies/${selected!.id}/profile-change-requests/${p.id}`,
                          {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "REJECTED", reviewerNote: "Not approved" }),
                          },
                        );
                        mutP();
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
