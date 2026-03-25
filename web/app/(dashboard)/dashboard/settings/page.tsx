"use client";

import { useEffect, useState } from "react";
import { Shield, Calculator, FileText, MapPin, Monitor, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { useApi } from "@/lib/swr";
import {
  DEFAULT_MONTHLY_PAYE_BRACKETS,
  SSNIT_EMPLOYEE_RATE,
  SSNIT_EMPLOYER_RATE,
  type TaxBracketInput,
} from "@/lib/ghana-tax";

interface CheckinSettingsPayload {
  id: string;
  checkinLockToFirstIp: boolean;
  checkinBoundIp: string | null;
  checkinEnterpriseEnabled: boolean;
  checkinEnforceIpAllowlist: boolean;
  checkinRequireFaceVerification: boolean;
  checkinFaceDistanceThreshold: number | null;
  checkinMaxFaceAttempts: number;
  kioskOfficeOpensAt: string | null;
  kioskOfficeClosesAt: string | null;
  kioskCutoffTime: string | null;
  kioskTimezone: string;
  allowedIps: {
    id: string;
    label: string | null;
    address: string;
    createdAt: string;
  }[];
}

interface IpAccessRequestRow {
  id: string;
  requestedIp: string;
  note: string | null;
  status: string;
  createdAt: string;
  company: { id: string; name: string };
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor?: { name: string; email: string };
}

const YEAR = new Date().getFullYear();

export default function SettingsPage() {
  const { selected, mutate: mutateCompanies } = useCompany();
  const { toast } = useToast();
  const { data: me } = useApi<{ role: string }>("/api/me");
  const isSuper = me?.role === "SUPER_ADMIN";
  const canEditCheckin =
    me?.role === "SUPER_ADMIN" ||
    me?.role === "COMPANY_ADMIN" ||
    me?.role === "HR";
  const canApproveIpRequest =
    me?.role === "SUPER_ADMIN" || me?.role === "COMPANY_ADMIN";
  const [payeScope, setPayeScope] = useState<"company" | "global">("company");
  const [editOpen, setEditOpen] = useState(false);
  const [brackets, setBrackets] = useState<TaxBracketInput[]>(DEFAULT_MONTHLY_PAYE_BRACKETS);
  const [bracketSource, setBracketSource] = useState<"company" | "global" | "default">("default");
  const [bracketsLoading, setBracketsLoading] = useState(false);
  const [savingBrackets, setSavingBrackets] = useState(false);

  // Geofence state
  const [geoLat, setGeoLat] = useState("");
  const [geoLng, setGeoLng] = useState("");
  const [geoRadius, setGeoRadius] = useState("");
  const [savingGeo, setSavingGeo] = useState(false);

  const checkinSettingsUrl =
    selected && canEditCheckin
      ? `/api/companies/${selected.id}/checkin-settings`
      : null;
  const { data: checkinSettings, mutate: mutateCheckinSettings } =
    useApi<CheckinSettingsPayload>(checkinSettingsUrl);

  const ipRequestsUrl =
    selected && canEditCheckin
      ? `/api/ip-access-requests?companyId=${encodeURIComponent(selected.id)}`
      : null;
  const { data: ipRequests, mutate: mutateIpRequests } =
    useApi<IpAccessRequestRow[]>(ipRequestsUrl);

  const [newAllowedIp, setNewAllowedIp] = useState("");
  const [newAllowedLabel, setNewAllowedLabel] = useState("");
  const [savingCheckinToggle, setSavingCheckinToggle] = useState(false);
  const [addingIp, setAddingIp] = useState(false);
  const [requestIp, setRequestIp] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [submittingIpRequest, setSubmittingIpRequest] = useState(false);

  // Load geofence values when company changes
  useEffect(() => {
    if (!selected) return;
    setGeoLat(selected.officeLat ? String(selected.officeLat) : "");
    setGeoLng(selected.officeLng ? String(selected.officeLng) : "");
    setGeoRadius(selected.geofenceRadius ? String(selected.geofenceRadius) : "");
  }, [selected]);

  async function handleSaveGeofence() {
    if (!selected) return;
    setSavingGeo(true);
    try {
      const res = await fetch("/api/companies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selected.id,
          officeLat: geoLat ? parseFloat(geoLat) : null,
          officeLng: geoLng ? parseFloat(geoLng) : null,
          geofenceRadius: geoRadius ? parseInt(geoRadius, 10) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Geofence settings saved");
      mutateCompanies();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save geofence settings");
    } finally {
      setSavingGeo(false);
    }
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLat(pos.coords.latitude.toFixed(7));
        setGeoLng(pos.coords.longitude.toFixed(7));
        toast.success("Location captured");
      },
      () => toast.error("Could not get your location"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const { data: auditLogs } = useApi<AuditEntry[]>("/api/audit-log");
  const logs = auditLogs ?? [];

  useEffect(() => {
    if (!isSuper && payeScope === "global") {
      setPayeScope("company");
    }
  }, [isSuper, payeScope]);

  useEffect(() => {
    if (payeScope === "global") {
      if (!isSuper) return;
      let cancelled = false;
      setBracketsLoading(true);
      (async () => {
        try {
          const res = await fetch(`/api/tax-brackets?global=true&year=${YEAR}`);
          if (!res.ok) throw new Error();
          const data = (await res.json()) as {
            source: "company" | "global" | "default";
            brackets: TaxBracketInput[];
          };
          if (!cancelled) {
            setBrackets(data.brackets);
            setBracketSource(data.source);
          }
        } catch {
          if (!cancelled) {
            setBrackets(DEFAULT_MONTHLY_PAYE_BRACKETS);
            setBracketSource("default");
          }
        } finally {
          if (!cancelled) setBracketsLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    if (!selected) {
      setBrackets(DEFAULT_MONTHLY_PAYE_BRACKETS);
      setBracketSource("default");
      return;
    }
    let cancelled = false;
    setBracketsLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/tax-brackets?companyId=${encodeURIComponent(selected.id)}&year=${YEAR}`,
        );
        if (!res.ok) throw new Error();
        const data = (await res.json()) as {
          source: "company" | "global" | "default";
          brackets: TaxBracketInput[];
        };
        if (!cancelled) {
          setBrackets(data.brackets);
          setBracketSource(data.source);
        }
      } catch {
        if (!cancelled) {
          setBrackets(DEFAULT_MONTHLY_PAYE_BRACKETS);
          setBracketSource("default");
        }
      } finally {
        if (!cancelled) setBracketsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payeScope, isSuper, selected]);

  function handleBracketChange(index: number, field: "minAmount" | "maxAmount" | "ratePercent", value: string) {
    setBrackets((prev) =>
      prev.map((b, i) =>
        i === index
          ? { ...b, [field]: field === "maxAmount" && value === "" ? null : Number(value) }
          : b,
      ),
    );
  }

  async function patchCheckinSettings(patch: Record<string, unknown>) {
    if (!selected) return;
    setSavingCheckinToggle(true);
    try {
      const res = await fetch(`/api/companies/${selected.id}/checkin-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Save failed");
      toast.success("Check-in security updated");
      mutateCheckinSettings();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingCheckinToggle(false);
    }
  }

  async function handleAddAllowedIp() {
    if (!selected || !newAllowedIp.trim()) return;
    setAddingIp(true);
    try {
      const res = await fetch(`/api/companies/${selected.id}/allowed-ips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: newAllowedIp.trim(),
          label: newAllowedLabel.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Failed");
      toast.success("IP added");
      setNewAllowedIp("");
      setNewAllowedLabel("");
      mutateCheckinSettings();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add IP");
    } finally {
      setAddingIp(false);
    }
  }

  async function handleDeleteAllowedIp(ipId: string) {
    if (!selected) return;
    try {
      const res = await fetch(
        `/api/companies/${selected.id}/allowed-ips/${encodeURIComponent(ipId)}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Failed");
      toast.success("IP removed");
      mutateCheckinSettings();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove IP");
    }
  }

  async function handleSubmitIpAccessRequest() {
    if (!selected || !requestIp.trim()) return;
    setSubmittingIpRequest(true);
    try {
      const res = await fetch("/api/ip-access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selected.id,
          requestedIp: requestIp.trim(),
          note: requestNote.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Failed");
      toast.success("Request submitted");
      setRequestIp("");
      setRequestNote("");
      mutateIpRequests();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSubmittingIpRequest(false);
    }
  }

  async function handleResolveIpRequest(id: string, status: "APPROVED" | "REJECTED") {
    try {
      const res = await fetch(`/api/ip-access-requests/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Failed");
      toast.success(status === "APPROVED" ? "Request approved" : "Request rejected");
      mutateIpRequests();
      mutateCheckinSettings();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function handleSaveBrackets() {
    if (payeScope === "company" && !selected) {
      toast.error("Select a company first.");
      return;
    }
    if (payeScope === "global" && !isSuper) {
      toast.error("Only Super Admin can save platform default brackets.");
      return;
    }
    setSavingBrackets(true);
    try {
      const res = await fetch("/api/tax-brackets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: payeScope === "global" ? null : selected!.id,
          year: YEAR,
          brackets,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Save failed");
      }
      if (payeScope === "global") {
        toast.success("Platform default tax brackets saved.");
        setBracketSource("global");
      } else {
        toast.success("Tax brackets saved for this company.");
        setBracketSource("company");
      }
      setEditOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save brackets.");
    } finally {
      setSavingBrackets(false);
    }
  }

  const canEditPaye =
    !bracketsLoading &&
    ((payeScope === "company" && !!selected) || (payeScope === "global" && isSuper));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-hgh-navy">Settings</h2>
        <p className="text-sm text-hgh-muted">
          PAYE for {YEAR}
          {payeScope === "global"
            ? " — platform default (all companies without a company-specific override)."
            : " — effective brackets for the selected company."}{" "}
          SSNIT rates and audit log below.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* PAYE Tax Brackets */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Calculator size={20} className="shrink-0 text-hgh-gold" />
            <div className="min-w-0 flex-1">
              <CardTitle>PAYE Tax Brackets (GRA Monthly)</CardTitle>
              <p className="mt-0.5 text-xs text-hgh-muted">
                Progressive income tax rates.
                {payeScope === "global" ? (
                  <>
                    {" "}
                    <Badge variant="warning" className="ml-1 align-middle">
                      {bracketsLoading
                        ? "Loading…"
                        : bracketSource === "global"
                          ? "Platform DB"
                          : "Built-in default"}
                    </Badge>
                  </>
                ) : selected ? (
                  <>
                    {" "}
                    <Badge variant="default" className="ml-1 align-middle">
                      {bracketsLoading
                        ? "Loading…"
                        : bracketSource === "company"
                          ? "Company"
                          : bracketSource === "global"
                            ? "Inherits platform"
                            : "Built-in default"}
                    </Badge>
                  </>
                ) : (
                  <span className="text-hgh-danger"> Select a company to load or edit.</span>
                )}
              </p>
              {isSuper && (
                <div className="mt-3 flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={payeScope === "company" ? "primary" : "ghost"}
                    onClick={() => setPayeScope("company")}
                  >
                    This company
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={payeScope === "global" ? "primary" : "ghost"}
                    onClick={() => setPayeScope("global")}
                  >
                    Platform default
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hgh-border text-left">
                  <th className="px-5 py-2 font-medium text-hgh-muted">From (GHS)</th>
                  <th className="px-5 py-2 font-medium text-hgh-muted">To (GHS)</th>
                  <th className="px-5 py-2 font-medium text-hgh-muted">Rate</th>
                </tr>
              </thead>
              <tbody>
                {brackets.map((b, i) => (
                  <tr key={i} className="border-b border-hgh-border last:border-0">
                    <td className="px-5 py-2 tabular-nums">{b.minAmount.toLocaleString()}</td>
                    <td className="px-5 py-2 tabular-nums">
                      {b.maxAmount !== null ? b.maxAmount.toLocaleString() : "No limit"}
                    </td>
                    <td className="px-5 py-2">
                      <Badge variant={b.ratePercent === 0 ? "success" : "default"}>
                        {b.ratePercent}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CardContent>
            <Button
              variant="ghost"
              size="sm"
              disabled={!canEditPaye}
              onClick={() => setEditOpen(true)}
            >
              Edit Brackets
            </Button>
            <p className="mt-2 text-xs text-hgh-muted">
              {payeScope === "global" ? (
                <>
                  <strong>Super Admin</strong> only: changes apply to every company that does not have its own
                  PAYE rows in the database.
                </>
              ) : (
                <>
                  Only <strong>Super Admin</strong> and <strong>Company Admin</strong> can save company
                  overrides.
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Geofence Settings */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <MapPin size={20} className="shrink-0 text-hgh-gold" />
              <div>
                <CardTitle>Geofence Settings</CardTitle>
                <p className="mt-0.5 text-xs text-hgh-muted">
                  Set office location for check-in validation. Employees outside the radius will be flagged.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-hgh-muted">Latitude</label>
                  <Input
                    type="number"
                    step="0.0000001"
                    placeholder="e.g. 5.6037"
                    value={geoLat}
                    onChange={(e) => setGeoLat(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-hgh-muted">Longitude</label>
                  <Input
                    type="number"
                    step="0.0000001"
                    placeholder="e.g. -0.1870"
                    value={geoLng}
                    onChange={(e) => setGeoLng(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-hgh-muted">Radius (metres)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 200"
                  value={geoRadius}
                  onChange={(e) => setGeoRadius(e.target.value)}
                />
                <p className="mt-1 text-xs text-hgh-muted">
                  Leave empty to disable geofence validation.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => void handleSaveGeofence()}
                  disabled={savingGeo || !selected}
                >
                  {savingGeo ? "Saving..." : "Save Geofence"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleUseMyLocation}
                  disabled={!selected}
                >
                  <MapPin size={14} />
                  Use My Location
                </Button>
              </div>
              {geoLat && geoLng && geoRadius && (
                <div className="rounded-lg border border-hgh-border bg-hgh-offwhite p-3 text-xs text-hgh-slate">
                  <p className="font-medium">Active geofence:</p>
                  <p>Center: {geoLat}, {geoLng}</p>
                  <p>Radius: {geoRadius}m</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Office kiosk — above the long "Check-in security" card so the bookmark stays visible */}
          {canEditCheckin && selected && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <Monitor size={20} className="shrink-0 text-hgh-gold" />
                <div>
                  <CardTitle>Office kiosk</CardTitle>
                  <p className="mt-0.5 text-xs text-hgh-muted">
                    Shared browser on the office PC: employees sign in with name, employee code, and
                    face capture—no Supabase login on that device. After closing time, check-out still
                    works. Set a cut-off time to stop new check-ins and drive absence marking (shifted
                    staff only).
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-hgh-slate">
                  Same IP lock as portal check-in: open this URL once on the kiosk PC while the
                  first-PC lock is on so that machine&apos;s IP is registered.
                </p>
                <div className="rounded-lg border border-hgh-border bg-hgh-offwhite p-3 font-mono text-xs break-all text-hgh-slate">
                  {(process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000") +
                    "/kiosk/checkin?c=" +
                    selected.id}
                </div>
                {checkinSettings ? (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-hgh-muted">
                        Kiosk timezone (IANA)
                      </label>
                      <Input
                        defaultValue={checkinSettings.kioskTimezone || "Africa/Accra"}
                        key={checkinSettings.kioskTimezone}
                        disabled={savingCheckinToggle}
                        onBlur={(e) => {
                          const tz = e.target.value.trim();
                          if (tz && tz !== checkinSettings.kioskTimezone) {
                            void patchCheckinSettings({ kioskTimezone: tz });
                          }
                        }}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-hgh-muted">
                          Office opens (optional)
                        </label>
                        <Input
                          type="time"
                          disabled={savingCheckinToggle}
                          defaultValue={checkinSettings.kioskOfficeOpensAt ?? ""}
                          key={`open-${checkinSettings.kioskOfficeOpensAt ?? "x"}`}
                          onBlur={(e) => {
                            const v = e.target.value;
                            const next = v === "" ? null : v;
                            if (next !== checkinSettings.kioskOfficeOpensAt) {
                              void patchCheckinSettings({ kioskOfficeOpensAt: next });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-hgh-muted">
                          Office closes (optional)
                        </label>
                        <Input
                          type="time"
                          disabled={savingCheckinToggle}
                          defaultValue={checkinSettings.kioskOfficeClosesAt ?? ""}
                          key={`close-${checkinSettings.kioskOfficeClosesAt ?? "x"}`}
                          onBlur={(e) => {
                            const v = e.target.value;
                            const next = v === "" ? null : v;
                            if (next !== checkinSettings.kioskOfficeClosesAt) {
                              void patchCheckinSettings({ kioskOfficeClosesAt: next });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-hgh-muted">
                          Cut-off (optional)
                        </label>
                        <Input
                          type="time"
                          disabled={savingCheckinToggle}
                          defaultValue={checkinSettings.kioskCutoffTime ?? ""}
                          key={`cut-${checkinSettings.kioskCutoffTime ?? "x"}`}
                          onBlur={(e) => {
                            const v = e.target.value;
                            const next = v === "" ? null : v;
                            if (next !== checkinSettings.kioskCutoffTime) {
                              void patchCheckinSettings({ kioskCutoffTime: next });
                            }
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-hgh-muted">
                      Leave times empty to disable that rule. With a cut-off set, a scheduled job marks
                      absences for employees who have a shift that day but never checked in—after the
                      cut-off in this timezone. Requires{" "}
                      <span className="font-mono">CRON_SECRET</span> on the server for Vercel Cron.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-hgh-muted">
                    Loading kiosk time settings… If this never finishes, fix Check-in settings (e.g. run
                    the latest SQL so kiosk columns exist) and refresh.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Enterprise check-in */}
          {canEditCheckin && selected && checkinSettings && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <Network size={20} className="shrink-0 text-hgh-gold" />
                <div>
                  <CardTitle>Check-in security</CardTitle>
                  <p className="mt-0.5 text-xs text-hgh-muted">
                    IP allowlist, audit sessions, and optional face verification for the employee portal.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-start gap-2 text-sm text-hgh-slate">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-hgh-border"
                    checked={checkinSettings.checkinLockToFirstIp}
                    disabled={savingCheckinToggle}
                    onChange={(e) =>
                      void patchCheckinSettings({
                        checkinLockToFirstIp: e.target.checked,
                      })
                    }
                  />
                  <span>
                    Lock employee check-in to one work PC (recommended). The first time someone opens
                    the employee check-in page on your chosen office machine, this system saves that
                    machine&apos;s public IP. After that, check-in only works from that IP—employees
                    cannot check in from home or another device. If your office IP changes (e.g. ISP
                    DHCP), use &quot;Clear registered IP&quot; and open check-in again on the right
                    PC.
                  </span>
                </label>
                {checkinSettings.checkinLockToFirstIp &&
                  (checkinSettings.checkinBoundIp ? (
                    <div className="rounded-lg border border-hgh-border bg-hgh-offwhite p-3 text-xs text-hgh-slate">
                      <p className="font-medium text-hgh-navy">Registered check-in IP</p>
                      <p className="mt-1 font-mono">{checkinSettings.checkinBoundIp}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="mt-2 underline"
                        disabled={savingCheckinToggle}
                        onClick={() =>
                          void patchCheckinSettings({ clearCheckinBoundIp: true })
                        }
                      >
                        Clear registered IP (next visit re-binds a new PC)
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-hgh-muted">
                      No IP bound yet. On the office PC you want employees to use, log in as an
                      employee and open Check-in once—the IP will be saved automatically.
                    </p>
                  ))}

                <p className="text-xs text-hgh-muted">
                  When &quot;Lock to one work PC&quot; is on, the manual IP list below is not used.
                </p>

                <label className="flex items-center gap-2 text-sm text-hgh-slate">
                  <input
                    type="checkbox"
                    className="rounded border-hgh-border"
                    checked={checkinSettings.checkinEnterpriseEnabled}
                    disabled={savingCheckinToggle}
                    onChange={(e) =>
                      void patchCheckinSettings({
                        checkinEnterpriseEnabled: e.target.checked,
                      })
                    }
                  />
                  Enable enterprise check-in (sessions and extra checks)
                </label>
                <label className="flex items-center gap-2 text-sm text-hgh-slate">
                  <input
                    type="checkbox"
                    className="rounded border-hgh-border"
                    checked={checkinSettings.checkinEnforceIpAllowlist}
                    disabled={
                      savingCheckinToggle ||
                      !checkinSettings.checkinEnterpriseEnabled ||
                      checkinSettings.checkinLockToFirstIp
                    }
                    onChange={(e) =>
                      void patchCheckinSettings({
                        checkinEnforceIpAllowlist: e.target.checked,
                      })
                    }
                  />
                  Enforce IP allowlist (when at least one IP is configured; off while first-PC lock
                  is enabled)
                </label>
                <label className="flex items-center gap-2 text-sm text-hgh-slate">
                  <input
                    type="checkbox"
                    className="rounded border-hgh-border"
                    checked={checkinSettings.checkinRequireFaceVerification}
                    disabled={savingCheckinToggle || !checkinSettings.checkinEnterpriseEnabled}
                    onChange={(e) =>
                      void patchCheckinSettings({
                        checkinRequireFaceVerification: e.target.checked,
                      })
                    }
                  />
                  Require face verification on clock in/out
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-hgh-muted">
                      Max face attempts
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      disabled={!checkinSettings.checkinEnterpriseEnabled}
                      defaultValue={checkinSettings.checkinMaxFaceAttempts}
                      key={checkinSettings.checkinMaxFaceAttempts}
                      onBlur={(e) => {
                        const n = parseInt(e.target.value, 10);
                        if (Number.isInteger(n) && n !== checkinSettings.checkinMaxFaceAttempts) {
                          void patchCheckinSettings({ checkinMaxFaceAttempts: n });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-hgh-muted">
                      Face distance threshold
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      disabled={!checkinSettings.checkinEnterpriseEnabled}
                      placeholder="0.55 default"
                      defaultValue={
                        checkinSettings.checkinFaceDistanceThreshold ?? ""
                      }
                      key={checkinSettings.checkinFaceDistanceThreshold ?? "null"}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        if (raw === "") {
                          void patchCheckinSettings({ checkinFaceDistanceThreshold: null });
                          return;
                        }
                        const n = parseFloat(raw);
                        if (Number.isFinite(n)) {
                          void patchCheckinSettings({ checkinFaceDistanceThreshold: n });
                        }
                      }}
                    />
                  </div>
                </div>

                <div
                  className={`border-t border-hgh-border pt-4 ${checkinSettings.checkinLockToFirstIp ? "pointer-events-none opacity-50" : ""}`}
                >
                  <p className="text-xs font-medium text-hgh-muted">Allowed IPs (enterprise allowlist)</p>
                  {checkinSettings.checkinLockToFirstIp && (
                    <p className="mt-1 text-xs text-hgh-muted">
                      Disabled while first-PC lock is enabled.
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Input
                      placeholder="e.g. 203.0.113.10"
                      value={newAllowedIp}
                      onChange={(e) => setNewAllowedIp(e.target.value)}
                      className="min-w-[140px] flex-1"
                      disabled={checkinSettings.checkinLockToFirstIp}
                    />
                    <Input
                      placeholder="Label (optional)"
                      value={newAllowedLabel}
                      onChange={(e) => setNewAllowedLabel(e.target.value)}
                      className="min-w-[100px] flex-1"
                      disabled={checkinSettings.checkinLockToFirstIp}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleAddAllowedIp()}
                      disabled={
                        addingIp ||
                        !newAllowedIp.trim() ||
                        checkinSettings.checkinLockToFirstIp
                      }
                    >
                      Add
                    </Button>
                  </div>
                  {checkinSettings.allowedIps.length === 0 ? (
                    <p className="mt-2 text-xs text-hgh-muted">No addresses yet.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm">
                      {checkinSettings.allowedIps.map((row) => (
                        <li
                          key={row.id}
                          className="flex items-center justify-between gap-2 rounded border border-hgh-border px-2 py-1.5"
                        >
                          <span className="font-mono text-xs text-hgh-slate">
                            {row.address}
                            {row.label ? (
                              <span className="text-hgh-muted"> — {row.label}</span>
                            ) : null}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-hgh-danger"
                            onClick={() => void handleDeleteAllowedIp(row.id)}
                          >
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border-t border-hgh-border pt-4">
                  <p className="text-xs font-medium text-hgh-muted">New IP request</p>
                  <p className="mt-1 text-xs text-hgh-muted">
                    Submit an office IP for review. Company or Super Admin can approve (adds to allowlist).
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Input
                      placeholder="Requested IP"
                      value={requestIp}
                      onChange={(e) => setRequestIp(e.target.value)}
                      className="min-w-[140px] flex-1"
                    />
                    <Input
                      placeholder="Note (optional)"
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                      className="min-w-[120px] flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleSubmitIpAccessRequest()}
                      disabled={submittingIpRequest || !requestIp.trim()}
                    >
                      Submit
                    </Button>
                  </div>
                  {ipRequests && ipRequests.filter((r) => r.status === "PENDING").length > 0 && (
                    <ul className="mt-3 space-y-2 text-sm">
                      {ipRequests
                        .filter((r) => r.status === "PENDING")
                        .map((r) => (
                          <li
                            key={r.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded border border-hgh-border px-2 py-2"
                          >
                            <span className="font-mono text-xs">
                              {r.requestedIp}
                              {r.note ? (
                                <span className="block text-hgh-muted">{r.note}</span>
                              ) : null}
                            </span>
                            {canApproveIpRequest && (
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => void handleResolveIpRequest(r.id, "APPROVED")}
                                >
                                  Approve
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="text-hgh-danger"
                                  onClick={() => void handleResolveIpRequest(r.id, "REJECTED")}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* SSNIT Rates */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Shield size={20} className="shrink-0 text-hgh-gold" />
              <div>
                <CardTitle>SSNIT Contribution Rates</CardTitle>
                <p className="mt-0.5 text-xs text-hgh-muted">Applied on basic salary.</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-hgh-slate">Employee</span>
                <Badge>{(SSNIT_EMPLOYEE_RATE * 100).toFixed(1)}%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-hgh-slate">Employer</span>
                <Badge>{(SSNIT_EMPLOYER_RATE * 100).toFixed(1)}%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-hgh-slate">Total</span>
                <Badge variant="warning">
                  {((SSNIT_EMPLOYEE_RATE + SSNIT_EMPLOYER_RATE) * 100).toFixed(1)}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Audit Log */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <FileText size={20} className="shrink-0 text-hgh-gold" />
              <CardTitle>Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-hgh-muted">No audit entries yet.</p>
              ) : (
                <div className="space-y-2">
                  {logs.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-hgh-slate">{log.action}</span>
                        <span className="text-hgh-muted"> on {log.entityType}</span>
                      </div>
                      <div className="text-xs text-hgh-muted">
                        {log.actor?.name ?? "System"} &middot;{" "}
                        {new Date(log.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Roles */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Shield size={20} className="shrink-0 text-hgh-gold" />
              <CardTitle>Roles &amp; Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ["Super Admin", "All companies, all features"],
                ["Company Admin", "Approve/reject payruns"],
                ["HR", "Manage employees & drafts"],
                ["Employee", "Self-service portal only"],
              ].map(([role, desc]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-hgh-slate">{role}</span>
                  <span className="text-xs text-hgh-muted">{desc}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Brackets Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={
          payeScope === "global" ? "Edit platform default PAYE brackets" : "Edit PAYE Tax Brackets"
        }
      >
        {payeScope === "global" && (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            Saving updates the global default used when a company has no company-specific brackets.
          </p>
        )}
        <div className="space-y-3">
          {brackets.map((b, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <div>
                {i === 0 && (
                  <label className="mb-1 block text-xs font-medium text-hgh-muted">From</label>
                )}
                <Input
                  type="number"
                  value={b.minAmount}
                  onChange={(e) => handleBracketChange(i, "minAmount", e.target.value)}
                />
              </div>
              <div>
                {i === 0 && (
                  <label className="mb-1 block text-xs font-medium text-hgh-muted">To</label>
                )}
                <Input
                  type="number"
                  value={b.maxAmount ?? ""}
                  placeholder="No limit"
                  onChange={(e) => handleBracketChange(i, "maxAmount", e.target.value)}
                />
              </div>
              <div>
                {i === 0 && (
                  <label className="mb-1 block text-xs font-medium text-hgh-muted">Rate %</label>
                )}
                <Input
                  type="number"
                  step="0.5"
                  value={b.ratePercent}
                  onChange={(e) => handleBracketChange(i, "ratePercent", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSaveBrackets()}
            disabled={savingBrackets || (payeScope === "company" && !selected)}
          >
            {savingBrackets ? "Saving…" : "Save Brackets"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
