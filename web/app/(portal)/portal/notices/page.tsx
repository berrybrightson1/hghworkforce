"use client";

import { Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/swr";

type Row = { id: string; title: string; body: string; publishedAt: string; readAt: string | null };

export default function PortalNoticesPage() {
  const { data: rows, mutate } = useApi<Row[]>("/api/me/notices");

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hgh-gold/15 text-hgh-gold">
          <Megaphone size={22} aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-hgh-navy">Notices</h1>
          <p className="mt-1 text-sm text-hgh-muted">Updates from your employer.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!rows?.length ? (
            <p className="text-sm text-hgh-muted">No notices yet.</p>
          ) : (
            rows.map((n) => (
              <div key={n.id} className="rounded-lg border border-hgh-border p-4">
                <p className="font-medium text-hgh-navy">{n.title}</p>
                <p className="text-xs text-hgh-muted">
                  {new Date(n.publishedAt).toLocaleString()}
                  {n.readAt ? " · Read" : ""}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-hgh-slate">{n.body}</p>
                {!n.readAt ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-3"
                    onClick={async () => {
                      await fetch(`/api/me/notices/${n.id}/read`, { method: "POST" });
                      mutate();
                    }}
                  >
                    Mark read
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
