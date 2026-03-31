"use client";

import { FolderOpen, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/lib/swr";

type Doc = {
  id: string;
  name: string;
  fileType: string | null;
  createdAt: string;
};

export default function PortalDocumentsPage() {
  const { data: docs, isLoading } = useApi<Doc[]>("/api/me/documents");

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hgh-gold/15 text-hgh-gold">
          <FolderOpen size={22} aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-hgh-navy">Documents</h1>
          <p className="mt-1 text-sm text-hgh-muted">Files shared by HR for your record.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your files</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-10 animate-pulse rounded bg-hgh-offwhite" />
              <div className="h-10 animate-pulse rounded bg-hgh-offwhite" />
            </div>
          ) : !docs || docs.length === 0 ? (
            <p className="text-sm text-hgh-muted">No documents uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-hgh-border">
              {docs.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium text-hgh-navy">{d.name}</p>
                    <p className="text-xs text-hgh-muted">
                      Added {new Date(d.createdAt).toLocaleDateString()}
                      {d.fileType ? ` · ${d.fileType}` : ""}
                    </p>
                  </div>
                  <a
                    href={`/api/me/documents/${d.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-hgh-gold hover:underline"
                  >
                    Download <ExternalLink size={14} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
