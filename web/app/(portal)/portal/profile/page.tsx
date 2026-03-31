"use client";

import { useState } from "react";
import { UserCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast/useToast";
import { useApi } from "@/lib/swr";

type MeEmployee = {
  id: string;
  companyId: string;
  employeeCode: string;
  name?: string | null;
  department: string;
  jobTitle: string;
};

export default function PortalProfilePage() {
  const { data: me, isLoading } = useApi<MeEmployee>("/api/me/employee");
  const { toast } = useToast();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);

  async function changePin(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/me/portal-pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin, confirmPin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("PIN updated.");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hgh-gold/15 text-hgh-gold">
          <UserCircle size={22} aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-hgh-navy">Profile</h1>
          <p className="mt-1 text-sm text-hgh-muted">Your workspace record and portal security.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {isLoading || !me ? (
            <div className="h-24 animate-pulse rounded bg-hgh-offwhite" />
          ) : (
            <>
              <p>
                <span className="text-hgh-muted">Name:</span>{" "}
                <span className="font-medium text-hgh-navy">{me.name?.trim() || me.employeeCode}</span>
              </p>
              <p>
                <span className="text-hgh-muted">Code:</span>{" "}
                <span className="font-medium text-hgh-navy">{me.employeeCode}</span>
              </p>
              <p>
                <span className="text-hgh-muted">Department:</span>{" "}
                <span className="text-hgh-navy">{me.department}</span>
              </p>
              <p>
                <span className="text-hgh-muted">Role:</span>{" "}
                <span className="text-hgh-navy">{me.jobTitle}</span>
              </p>
              <p className="pt-2 text-xs text-hgh-muted">
                To update salary, bank details, or employment terms, contact your HR or payroll team.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Change portal PIN</CardTitle>
          <p className="text-sm font-normal text-hgh-muted">
            Use a 4-digit PIN. If you are still on a temporary PIN from HR, finish setup on{" "}
            <strong>/portal/set-pin</strong> first.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void changePin(e)} className="max-w-md space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-slate" htmlFor="cur-pin">
                Current PIN
              </label>
              <Input
                id="cur-pin"
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-slate" htmlFor="new-pin">
                New PIN
              </label>
              <Input
                id="new-pin"
                inputMode="numeric"
                maxLength={4}
                autoComplete="new-password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-slate" htmlFor="conf-pin">
                Confirm new PIN
              </label>
              <Input
                id="conf-pin"
                inputMode="numeric"
                maxLength={4}
                autoComplete="new-password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
            <Button type="submit" disabled={saving || currentPin.length !== 4 || newPin.length !== 4}>
              {saving ? "Saving…" : "Update PIN"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
