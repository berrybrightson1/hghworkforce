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

type Row = { id: string; date: string; name: string };

export default function WorkplaceHolidaysPage() {
  const { selected } = useCompany();
  const { toast } = useToast();
  const { data: me } = useApi<{ role: string }>("/api/me");
  const canEditHolidays = me?.role === "SUPER_ADMIN" || me?.role === "COMPANY_ADMIN";
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const url = selected ? `/api/companies/${selected.id}/public-holidays` : null;
  const { data: rows, mutate } = useApi<Row[]>(url);

  async function seed() {
    if (!selected) return;
    const y = new Date().getFullYear();
    const res = await fetch(`/api/companies/${selected.id}/public-holidays/seed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: y }),
    });
    if (!res.ok) toast.error("Seed failed");
    else {
      toast.success(`Seeded template holidays for ${y}`);
      mutate();
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/workplace" className="inline-flex items-center gap-1 text-sm text-hgh-gold hover:underline">
        <ArrowLeft size={16} aria-hidden /> Workplace
      </Link>
      <h1 className="text-xl font-semibold text-hgh-navy">Public holidays</h1>

      {canEditHolidays ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add holiday</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-2">
            <div>
              <label className="text-xs text-hgh-muted">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="text-xs text-hgh-muted">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Holiday name"
                className="w-56"
              />
            </div>
            <Button
              type="button"
              onClick={async () => {
                if (!selected || !date || !name.trim()) return;
                const res = await fetch(`/api/companies/${selected.id}/public-holidays`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ date, name: name.trim() }),
                });
                if (!res.ok) toast.error("Failed");
                else {
                  toast.success("Added");
                  setName("");
                  mutate();
                }
              }}
            >
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={() => void seed()}>
              Seed Ghana template (current year)
            </Button>
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-lg border border-hgh-border bg-hgh-offwhite px-4 py-3 text-sm text-hgh-muted">
          Only company administrators can add, remove, or seed public holidays. You can still use this list as a
          reference for payroll and attendance.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">List</CardTitle>
        </CardHeader>
        <CardContent>
          {!rows?.length ? (
            <p className="text-sm text-hgh-muted">No holidays. Add or seed above.</p>
          ) : (
            <ul className="divide-y divide-hgh-border text-sm">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {r.name} — {new Date(r.date).toLocaleDateString()}
                  </span>
                  {canEditHolidays ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-hgh-danger"
                      onClick={async () => {
                        if (!selected) return;
                        await fetch(`/api/companies/${selected.id}/public-holidays/${r.id}`, { method: "DELETE" });
                        mutate();
                      }}
                    >
                      Remove
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
