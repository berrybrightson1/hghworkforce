"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Shield,
  Calculator,
  FileText,
  Monitor,
  Network,
  PiggyBank,
  Webhook,
  KeyRound,
  UserCircle,
  Mail,
  Building2,
  Globe,
  PencilLine,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeSelect } from "@/components/ui/time-select";
import { CopyIconButton } from "@/components/ui/copy-button";
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
import { cn } from "@/lib/utils";
import type { SettingsSectionId } from "./types";

const settingsPanelClass =
  "overflow-hidden rounded-lg border border-zinc-200/90 bg-white shadow-none";
const settingsPanelHeaderClass =
  "border-b border-zinc-100/90 bg-zinc-50/70 px-5 py-4 sm:px-6";

interface CheckinSettingsPayload {
  id: string;
  checkinEnterpriseEnabled: boolean;
  kioskOfficeOpensAt: string | null;
  kioskOfficeClosesAt: string | null;
  kioskCutoffTime: string | null;
  kioskTimezone: string;
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

export function SettingsSectionView({ active }: { active: SettingsSectionId }) {
  const pathname = usePathname();
  const urlSearch = useSearchParams();
  const changePasswordReturnTo = useMemo(() => {
    const qs = urlSearch?.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, urlSearch]);
  const { selected } = useCompany();
  const { toast } = useToast();
  const { data: me, mutate: mutateMe } = useApi<{
    id: string;
    email: string;
    name: string;
    firstName?: string | null;
    lastName?: string | null;
    role: string;
    companyId?: string | null;
    referralCode?: string | null;
    referralCount?: number;
    referralMonthsEarned?: number;
  }>("/api/me");
  const appPublicBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
  const referralInviteUrl = me?.referralCode
    ? `${appPublicBase}/sign-up?ref=${encodeURIComponent(me.referralCode)}`
    : "";
  const isSuper = me?.role === "SUPER_ADMIN";
  const canEditCheckin = me?.role === "SUPER_ADMIN" || me?.role === "COMPANY_ADMIN";
  const [payeScope, setPayeScope] = useState<"company" | "global">("company");
  const [editOpen, setEditOpen] = useState(false);
  const [brackets, setBrackets] = useState<TaxBracketInput[]>(DEFAULT_MONTHLY_PAYE_BRACKETS);
  const [bracketSource, setBracketSource] = useState<"company" | "global" | "default">("default");
  const [bracketsLoading, setBracketsLoading] = useState(false);
  const [savingBrackets, setSavingBrackets] = useState(false);

  /* ── Profile edit state ────────────────────────────────────────────────── */
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileInited, setProfileInited] = useState(false);

  // Seed form fields from API data once loaded
  useEffect(() => {
    if (!me || profileInited) return;
    setProfileFirstName(me.firstName ?? me.name?.split(" ")[0] ?? "");
    setProfileLastName(me.lastName ?? me.name?.split(" ").slice(1).join(" ") ?? "");
    setProfileEmail(me.email ?? "");
    setProfileInited(true);
  }, [me, profileInited]);

  // Track dirty state
  useEffect(() => {
    if (!me) return;
    const origFirst = me.firstName ?? me.name?.split(" ")[0] ?? "";
    const origLast = me.lastName ?? me.name?.split(" ").slice(1).join(" ") ?? "";
    setProfileDirty(
      profileFirstName.trim() !== origFirst ||
      profileLastName.trim() !== origLast ||
      profileEmail.trim() !== (me.email ?? ""),
    );
  }, [profileFirstName, profileLastName, profileEmail, me]);

  async function handleSaveProfile() {
    if (!profileDirty || profileSaving) return;
    setProfileSaving(true);
    try {
      const payload: Record<string, string> = {};
      if (profileFirstName.trim()) payload.firstName = profileFirstName.trim();
      if (profileLastName.trim()) payload.lastName = profileLastName.trim();
      if (profileEmail.trim() && profileEmail.trim() !== me?.email) {
        payload.email = profileEmail.trim();
      }
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save profile");
        return;
      }
      if (data.emailChanged) {
        toast.success("Profile saved. Check your new email for a verification link.");
      } else {
        toast.success("Profile updated");
      }
      // Refresh /api/me cache, then re-seed form from the fresh data
      await mutateMe();
      setProfileInited(false);
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  }

  const checkinSettingsUrl =
    selected && canEditCheckin
      ? `/api/companies/${selected.id}/checkin-settings`
      : null;
  const { data: checkinSettings, mutate: mutateCheckinSettings } =
    useApi<CheckinSettingsPayload>(checkinSettingsUrl);

  const [savingCheckinToggle, setSavingCheckinToggle] = useState(false);

  const [auditAction, setAuditAction] = useState("");
  const [auditEntity, setAuditEntity] = useState("");
  const auditUrl =
    auditAction.trim() || auditEntity.trim()
      ? `/api/audit-log?action=${encodeURIComponent(auditAction.trim())}&entityType=${encodeURIComponent(auditEntity.trim())}&take=200`
      : "/api/audit-log?take=200";
  const { data: auditLogs } = useApi<AuditEntry[]>(auditUrl);
  const logs = auditLogs ?? [];

  const canCompanyPayrollSettings =
    me?.role === "SUPER_ADMIN" || me?.role === "COMPANY_ADMIN";
  const payrollSettingsUrl =
    selected && canCompanyPayrollSettings
      ? `/api/companies/${selected.id}/payroll-settings`
      : null;
  const { data: payrollSettings, mutate: mutPayrollSettings } = useApi<{
    tier2PensionEnabled: boolean;
    tier2EmployeePercent: number;
    tier2EmployerPercent: number;
    showBirthdaysOnDashboard: boolean;
    birthdayLookaheadDays: number;
    payslipPrimaryHex: string;
    payslipAccentHex: string;
    payslipThemeVariant: string;
    overtimeHourlyMultiplier: number;
    standardHoursPerMonth: number;
    includeAttendanceOvertimeInPayrun: boolean;
  }>(payrollSettingsUrl);

  const webhooksUrl =
    selected && canCompanyPayrollSettings
      ? `/api/companies/${selected.id}/webhooks`
      : null;
  const { data: companyWebhooks, mutate: mutWebhooks } = useApi<
    { id: string; url: string; payrunApproved: boolean; isActive: boolean }[]
  >(webhooksUrl);

  const [newHookUrl, setNewHookUrl] = useState("");

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

  /** Match POST /api/tax-brackets: company saves are admin-only; global defaults are super-admin only. */
  const canEditPaye =
    !bracketsLoading &&
    ((payeScope === "company" && !!selected && canCompanyPayrollSettings) ||
      (payeScope === "global" && isSuper));

  return (
    <>
      <div className="min-w-0 space-y-0">
            {active === "taxes" && (
            <section className="scroll-mt-28">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Taxes · {YEAR}
              </p>
              <h2 className="text-lg font-semibold text-zinc-900">PAYE tax brackets</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {payeScope === "global"
                  ? "Platform default for all companies without a company-specific override."
                  : "Effective GRA monthly brackets for the selected company."}
              </p>
              <Card className={cn("mt-4", settingsPanelClass)}>
          <CardHeader className={cn("flex flex-row items-center gap-3", settingsPanelHeaderClass)}>
            <Calculator size={20} className="shrink-0 text-hgh-gold" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-zinc-900">Bracket schedule</CardTitle>
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
            </div>
          </CardHeader>
          {isSuper ? (
            <div className="space-y-2 border-b border-zinc-100/90 bg-zinc-50/70 px-5 py-3 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Which brackets are you editing?
              </p>
              <p className="sr-only" aria-live="polite">
                {payeScope === "company"
                  ? "Editing PAYE brackets for this company."
                  : "Editing platform default PAYE brackets."}
              </p>
              <div className="inline-flex w-full max-w-md gap-0.5 rounded-lg border border-zinc-200/90 bg-zinc-100/80 p-0.5">
                <button
                  type="button"
                  aria-label="Edit PAYE brackets for this company only"
                  className={cn(
                    "flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors",
                    payeScope === "company"
                      ? "bg-hgh-gold text-hgh-navy shadow-sm"
                      : "text-zinc-600 hover:bg-white/80 hover:text-hgh-navy",
                  )}
                  onClick={() => setPayeScope("company")}
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                  <span className="truncate">This company</span>
                </button>
                <button
                  type="button"
                  aria-label="Edit platform default PAYE brackets"
                  className={cn(
                    "flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors",
                    payeScope === "global"
                      ? "bg-hgh-navy text-white shadow-sm"
                      : "text-zinc-600 hover:bg-white/80 hover:text-hgh-navy",
                  )}
                  onClick={() => setPayeScope("global")}
                >
                  <Globe className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                  <span className="truncate">Platform default</span>
                </button>
              </div>
              <p className="max-w-xl text-[11px] leading-snug text-zinc-500">
                <strong className="text-zinc-700">This company</strong> overrides apply only to the workspace selected
                in the header. <strong className="text-zinc-700">Platform default</strong> applies when a company has no
                custom brackets.
              </p>
            </div>
          ) : null}
          <div className="overflow-x-auto px-5 sm:px-6">
            <table className="w-full max-w-2xl text-sm">
              <thead>
                <tr className="border-b border-hgh-border text-left">
                  <th className="py-2.5 pr-4 font-medium text-hgh-muted sm:pr-6">From (GHS)</th>
                  <th className="py-2.5 pr-4 font-medium text-hgh-muted sm:pr-6">To (GHS)</th>
                  <th className="py-2.5 font-medium text-hgh-muted">Rate</th>
                </tr>
              </thead>
              <tbody>
                {brackets.map((b, i) => (
                  <tr key={i} className="border-b border-hgh-border last:border-0">
                    <td className="py-2.5 pr-4 tabular-nums sm:pr-6">{b.minAmount.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 tabular-nums sm:pr-6">
                      {b.maxAmount !== null ? b.maxAmount.toLocaleString() : "No limit"}
                    </td>
                    <td className="py-2.5">
                      <Badge variant={b.ratePercent === 0 ? "success" : "default"} className="tabular-nums">
                        {b.ratePercent}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CardContent className="px-5 sm:px-6">
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={!canEditPaye}
              onClick={() => setEditOpen(true)}
              className="w-full gap-2 shadow-sm sm:w-auto"
            >
              <PencilLine className="h-4 w-4 shrink-0" aria-hidden />
              Edit brackets
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
            </section>
            )}

          {/* Office kiosk */}
          {active === "office-kiosk" && (
            <>
            {canEditCheckin && selected ? (
            <section className="scroll-mt-28">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Check-in
              </p>
              <h2 className="text-lg font-semibold text-zinc-900">Office kiosk</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Browser link for shared office PCs; staff use name, employee code, and phone QR verification—no Supabase
                login on that device.
              </p>
            <Card className={cn("mt-4", settingsPanelClass)}>
              <CardHeader className={cn("flex flex-row items-center gap-3", settingsPanelHeaderClass)}>
                <Monitor size={20} className="shrink-0 text-hgh-gold" />
                <div>
                  <CardTitle className="text-zinc-900">Kiosk URL &amp; hours</CardTitle>
                  <p className="mt-0.5 text-xs text-hgh-muted">
                    Set timezone and optional office window / cut-off for the kiosk.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-hgh-slate">
                  Open this URL on the shared office PC. Staff check in and out here: name + employee code, then verify
                  with their bound phone (QR scan and one-time code)—not from the employee portal.
                </p>
                <div className="flex items-start gap-2 rounded-lg border border-hgh-border bg-hgh-offwhite p-3">
                  <code className="min-w-0 flex-1 break-all font-mono text-xs text-hgh-slate">
                    {(process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000") +
                      "/kiosk/checkin?c=" +
                      selected.id}
                  </code>
                  <CopyIconButton
                    text={
                      (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000") +
                      "/kiosk/checkin?c=" +
                      selected.id
                    }
                    label="Copy kiosk URL"
                    hint="Copies the office kiosk link. Open it on the shared PC used for punch-in/out; employees do not clock in from the portal."
                    size="md"
                    className="shrink-0 text-hgh-slate"
                  />
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
                      <p className="mt-1 text-xs text-hgh-muted">
                        Also used for shift late, early departure, overtime, and the employee portal Attendance
                        page (same civil day as the kiosk)—must match how you define shift start/end times.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-hgh-muted">
                          Office opens (optional)
                        </label>
                        <TimeSelect
                          allowEmpty
                          emptyLabel="Not set"
                          disabled={savingCheckinToggle}
                          value={checkinSettings.kioskOfficeOpensAt ?? ""}
                          key={`open-${checkinSettings.kioskOfficeOpensAt ?? "x"}`}
                          onChange={(v) => {
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
                        <TimeSelect
                          allowEmpty
                          emptyLabel="Not set"
                          disabled={savingCheckinToggle}
                          value={checkinSettings.kioskOfficeClosesAt ?? ""}
                          key={`close-${checkinSettings.kioskOfficeClosesAt ?? "x"}`}
                          onChange={(v) => {
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
                        <TimeSelect
                          allowEmpty
                          emptyLabel="Not set"
                          disabled={savingCheckinToggle}
                          value={checkinSettings.kioskCutoffTime ?? ""}
                          key={`cut-${checkinSettings.kioskCutoffTime ?? "x"}`}
                          onChange={(v) => {
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
            </section>
            ) : (
              <p className="rounded-lg border border-zinc-200/80 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
                Select a company in the sidebar. Only Company Admin or Super Admin can configure the office kiosk.
              </p>
            )}
            </>
          )}

          {/* Enterprise check-in */}
          {active === "checkin-security" && (
            <>
            {canEditCheckin && selected && checkinSettings ? (
            <section className="scroll-mt-28">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Check-in
              </p>
              <h2 className="text-lg font-semibold text-zinc-900">Check-in security</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Clock-in and clock-out happen only on the office kiosk (QR + device-bound phone verification). Optional
                enterprise check-in adds extra audit metadata; it does not enable portal punching.
              </p>
            <Card className={cn("mt-4", settingsPanelClass)}>
              <CardHeader className={cn("flex flex-row items-center gap-3", settingsPanelHeaderClass)}>
                <Network size={20} className="shrink-0 text-hgh-gold" />
                <div>
                  <CardTitle className="text-zinc-900">Check-in policies</CardTitle>
                  <p className="mt-0.5 text-xs text-hgh-muted">
                    Kiosk uses device-bound QR verification. Employee device bindings can be reset from each employee&apos;s profile page.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  Enable enterprise check-in (audit / session metadata — kiosk remains the only punch channel)
                </label>
              </CardContent>
            </Card>
            </section>
            ) : (
              <p className="rounded-lg border border-zinc-200/80 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
                {canEditCheckin && selected
                  ? "Loading check-in settings…"
                  : "Select a company in the sidebar. Only Company Admin or Super Admin can change check-in security."}
              </p>
            )}
            </>
          )}

          {active === "ssnit" && (
          <section className="scroll-mt-28">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              Contributions
            </p>
            <h2 className="text-lg font-semibold text-zinc-900">SSNIT rates</h2>
            <p className="mt-1 text-sm text-zinc-500">Applied on basic salary for payroll runs.</p>
          <Card className={cn("mt-4", settingsPanelClass)}>
            <CardHeader className={cn("flex flex-row items-center gap-3", settingsPanelHeaderClass)}>
              <Shield size={20} className="shrink-0 text-hgh-gold" />
              <div>
                <CardTitle className="text-zinc-900">Employee &amp; employer</CardTitle>
                <p className="mt-0.5 text-xs text-hgh-muted">Standard rates used in calculations.</p>
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
          </section>
          )}

          {active === "audit" && (
          <section className="scroll-mt-28">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              Activity
            </p>
            <h2 className="text-lg font-semibold text-zinc-900">Audit log</h2>
            <p className="mt-1 text-sm text-zinc-500">Recent security and configuration events.</p>
          <Card className={cn("mt-4", settingsPanelClass)}>
            <CardHeader className={cn("flex flex-row items-center gap-3", settingsPanelHeaderClass)}>
              <FileText size={20} className="shrink-0 text-hgh-gold" />
              <CardTitle className="text-zinc-900">Recent entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap items-end gap-2">
                <div>
                  <label className="mb-1 block text-xs text-hgh-muted">Action contains</label>
                  <Input value={auditAction} onChange={(e) => setAuditAction(e.target.value)} className="w-40" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-hgh-muted">Entity type contains</label>
                  <Input value={auditEntity} onChange={(e) => setAuditEntity(e.target.value)} className="w-40" />
                </div>
                <a
                  className="text-sm font-medium text-hgh-gold underline underline-offset-2"
                  href={
                    "/api/audit-log?format=csv&take=2000" +
                    (auditAction.trim() ? `&action=${encodeURIComponent(auditAction.trim())}` : "") +
                    (auditEntity.trim() ? `&entityType=${encodeURIComponent(auditEntity.trim())}` : "")
                  }
                >
                  Download CSV
                </a>
              </div>
              {logs.length === 0 ? (
                <p className="text-sm text-hgh-muted">No audit entries yet.</p>
              ) : (
                <div className="space-y-2">
                  {logs.slice(0, 50).map((log) => (
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
          </section>
          )}

          {active === "roles" && (
          <section className="scroll-mt-28">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              Access
            </p>
            <h2 className="text-lg font-semibold text-zinc-900">Roles &amp; access</h2>
            <p className="mt-1 text-sm text-zinc-500">Who can do what in the dashboard and portal.</p>
          <Card className={cn("mt-4", settingsPanelClass)}>
            <CardHeader className={cn("flex flex-row items-center gap-3", settingsPanelHeaderClass)}>
              <Shield size={20} className="shrink-0 text-hgh-gold" />
              <CardTitle className="text-zinc-900">Role summary</CardTitle>
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
          </section>
          )}

      {active === "tier2-pension" && (
        <>
        {selected && canCompanyPayrollSettings && payrollSettings ? (
        <section className="scroll-mt-28">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Payroll
          </p>
          <h2 className="text-lg font-semibold text-zinc-900">Tier 2 pension</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Occupational scheme deductions on basic salary (company-specific).
          </p>
        <Card className={cn("mt-4", settingsPanelClass)}>
          <CardHeader className={cn("flex flex-row items-center gap-2", settingsPanelHeaderClass)}>
            <PiggyBank className="text-hgh-gold" size={20} aria-hidden />
            <CardTitle className="text-base text-zinc-900">Occupational Tier 2</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-hgh-muted">
            <p>
              When enabled, each payroll line deducts employee % and records employer % of{" "}
              <strong>basic salary</strong> (same staff scope as SSNIT). Adjust in line with your
              scheme rules.
            </p>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={payrollSettings.tier2PensionEnabled}
                onChange={async (e) => {
                  const res = await fetch(`/api/companies/${selected.id}/payroll-settings`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tier2PensionEnabled: e.target.checked }),
                  });
                  if (res.ok) mutPayrollSettings();
                }}
                className="rounded border-hgh-border"
              />
              Enable Tier 2 on pay runs
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-hgh-muted">
                  Employee % of basic
                </label>
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={payrollSettings.tier2EmployeePercent}
                  id="tier2ee"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-hgh-muted">
                  Employer % of basic
                </label>
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={payrollSettings.tier2EmployerPercent}
                  id="tier2er"
                />
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const ee = Number((document.getElementById("tier2ee") as HTMLInputElement)?.value);
                const er = Number((document.getElementById("tier2er") as HTMLInputElement)?.value);
                const res = await fetch(`/api/companies/${selected.id}/payroll-settings`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    tier2EmployeePercent: ee,
                    tier2EmployerPercent: er,
                  }),
                });
                if (res.ok) {
                  mutPayrollSettings();
                  toast.success("Tier 2 rates saved. Regenerate draft pay runs to apply.");
                } else toast.error("Save failed");
              }}
            >
              Save rates
            </Button>
          </CardContent>
        </Card>

        <Card className={cn("mt-4", settingsPanelClass)}>
          <CardHeader className={cn("flex flex-row items-center gap-2", settingsPanelHeaderClass)}>
            <FileText className="text-hgh-gold" size={20} aria-hidden />
            <CardTitle className="text-base text-zinc-900">Payslip branding &amp; overtime</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-hgh-muted">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={payrollSettings.showBirthdaysOnDashboard}
                onChange={async (e) => {
                  const res = await fetch(`/api/companies/${selected.id}/payroll-settings`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ showBirthdaysOnDashboard: e.target.checked }),
                  });
                  if (res.ok) mutPayrollSettings();
                }}
                className="rounded border-hgh-border"
              />
              Show birthdays / anniversaries widget (dashboard workplace hub)
            </label>
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-muted">Birthday lookahead (days)</label>
              <Input
                type="number"
                min={0}
                max={365}
                defaultValue={payrollSettings.birthdayLookaheadDays}
                id="bdays-lookahead"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-hgh-muted">Payslip primary (#hex)</label>
                <Input defaultValue={payrollSettings.payslipPrimaryHex} id="pslip-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-hgh-muted">Payslip accent (#hex)</label>
                <Input defaultValue={payrollSettings.payslipAccentHex} id="pslip-accent" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-muted">Payslip variant</label>
              <Input defaultValue={payrollSettings.payslipThemeVariant} id="pslip-variant" placeholder="DEFAULT | MINIMAL | STRIPED" />
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                defaultChecked={payrollSettings.includeAttendanceOvertimeInPayrun}
                id="ot-include"
                className="rounded border-hgh-border"
              />
              Include attendance overtime in draft pay runs
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-hgh-muted">OT hourly multiplier</label>
                <Input
                  type="number"
                  step={0.1}
                  defaultValue={payrollSettings.overtimeHourlyMultiplier}
                  id="ot-mult"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-hgh-muted">Std hours / month (for OT rate)</label>
                <Input
                  type="number"
                  step={1}
                  defaultValue={payrollSettings.standardHoursPerMonth}
                  id="ot-std"
                />
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/companies/${selected.id}/payroll-settings`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    birthdayLookaheadDays: Number(
                      (document.getElementById("bdays-lookahead") as HTMLInputElement).value,
                    ),
                    payslipPrimaryHex: (document.getElementById("pslip-primary") as HTMLInputElement).value,
                    payslipAccentHex: (document.getElementById("pslip-accent") as HTMLInputElement).value,
                    payslipThemeVariant: (document.getElementById("pslip-variant") as HTMLInputElement).value,
                    includeAttendanceOvertimeInPayrun: (
                      document.getElementById("ot-include") as HTMLInputElement
                    ).checked,
                    overtimeHourlyMultiplier: Number((document.getElementById("ot-mult") as HTMLInputElement).value),
                    standardHoursPerMonth: Number((document.getElementById("ot-std") as HTMLInputElement).value),
                  }),
                });
                if (res.ok) {
                  mutPayrollSettings();
                  toast.success("Saved payslip / overtime / birthday settings.");
                } else toast.error("Save failed");
              }}
            >
              Save payslip &amp; overtime
            </Button>
          </CardContent>
        </Card>
        </section>
        ) : (
          <p className="rounded-lg border border-zinc-200/80 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
            Select a company. Tier 2 settings are available once payroll settings load and for Company
            Admins and Super Admins.
          </p>
        )}
        </>
      )}

      {active === "webhooks" && (
        <>
        {selected && canCompanyPayrollSettings ? (
        <section className="scroll-mt-28">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Integrations
          </p>
          <h2 className="text-lg font-semibold text-zinc-900">Webhooks</h2>
          <p className="mt-1 text-sm text-zinc-500">
            HTTPS endpoints notified when a pay run is approved (signed payloads).
          </p>
        <Card className={cn("mt-4", settingsPanelClass)}>
          <CardHeader className={cn("flex flex-row items-center gap-2", settingsPanelHeaderClass)}>
            <Webhook className="text-hgh-gold" size={20} aria-hidden />
            <CardTitle className="text-base text-zinc-900">Pay run approved</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-hgh-muted">
              HTTPS endpoints receive JSON with event <code className="text-xs">payrun.approved</code>{" "}
              and header <code className="text-xs">X-HGH-Signature: sha256=&lt;hmac&gt;</code> of the raw
              body using your webhook secret (shown once when created).
            </p>
            <div className="flex flex-wrap gap-2">
              <Input
                className="max-w-md flex-1"
                placeholder="https://hooks.example.com/hgh"
                value={newHookUrl}
                onChange={(e) => setNewHookUrl(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  const res = await fetch(`/api/companies/${selected.id}/webhooks`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: newHookUrl.trim() }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    toast.error(data.error || "Failed");
                    return;
                  }
                  toast.success(
                    data.secret
                      ? `Webhook added. Copy secret now: ${data.secret}`
                      : "Webhook added.",
                  );
                  setNewHookUrl("");
                  mutWebhooks();
                }}
              >
                Add webhook
              </Button>
            </div>
            <div className="space-y-2">
              {(companyWebhooks ?? []).length === 0 ? (
                <p className="text-hgh-muted">No webhooks.</p>
              ) : (
                (companyWebhooks ?? []).map((h) => (
                  <div
                    key={h.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hgh-border px-3 py-2"
                  >
                    <span className="max-w-[280px] truncate text-xs">{h.url}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={h.isActive ? "success" : "default"}>
                        {h.isActive ? "on" : "off"}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await fetch(`/api/companies/${selected.id}/webhooks/${h.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ isActive: !h.isActive }),
                          });
                          mutWebhooks();
                        }}
                      >
                        Toggle
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-hgh-danger"
                        onClick={async () => {
                          if (!confirm("Delete this webhook?")) return;
                          await fetch(`/api/companies/${selected.id}/webhooks/${h.id}`, {
                            method: "DELETE",
                          });
                          mutWebhooks();
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        </section>
        ) : (
          <p className="rounded-lg border border-zinc-200/80 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
            Select a company. Webhooks are managed by Company Admins and Super Admins.
          </p>
        )}
        </>
      )}

      {active === "account" && (
      <section className="scroll-mt-28">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          Your account
        </p>
        <h2 className="text-lg font-semibold text-zinc-900">Profile</h2>
        <p className="mt-1 text-sm text-zinc-500">Manage your personal information and account details.</p>

      {/* ── Profile card ─────────────────────────────────────────────────── */}
      <Card className={cn("mt-4", settingsPanelClass)}>
        <CardHeader className={cn("flex flex-row items-center gap-2", settingsPanelHeaderClass)}>
          <UserCircle className="text-hgh-gold" size={20} aria-hidden />
          <CardTitle className="text-base text-zinc-900">Personal information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-first" className="mb-1.5 block text-xs font-medium text-hgh-slate">
                First name
              </label>
              <Input
                id="profile-first"
                value={profileFirstName}
                onChange={(e) => setProfileFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div>
              <label htmlFor="profile-last" className="mb-1.5 block text-xs font-medium text-hgh-slate">
                Last name
              </label>
              <Input
                id="profile-last"
                value={profileLastName}
                onChange={(e) => setProfileLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-email" className="mb-1.5 block text-xs font-medium text-hgh-slate">
              Email address
            </label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hgh-muted" />
              <Input
                id="profile-email"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="you@company.com"
                className="pl-9"
              />
            </div>
            {profileEmail.trim() !== "" && profileEmail.trim() !== me?.email && (
              <p className="mt-1.5 text-xs text-amber-600">
                Changing your email will send a verification link to the new address.
              </p>
            )}
          </div>

          {/* Read-only fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium text-hgh-slate">Role</p>
              <div className="flex h-10 items-center rounded-lg border border-hgh-border bg-hgh-offwhite/60 px-3">
                <Badge variant="default" className="text-[11px]">
                  {me?.role?.replace("_", " ") ?? "—"}
                </Badge>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-hgh-slate">Workspace</p>
              <div className="flex h-10 items-center gap-2 rounded-lg border border-hgh-border bg-hgh-offwhite/60 px-3">
                <Building2 size={14} className="shrink-0 text-hgh-muted" />
                <span className="truncate text-sm text-hgh-navy">{selected?.name ?? "—"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-hgh-border/60 pt-4">
            {profileDirty && (
              <button
                type="button"
                onClick={() => {
                  if (!me) return;
                  setProfileFirstName(me.firstName ?? me.name?.split(" ")[0] ?? "");
                  setProfileLastName(me.lastName ?? me.name?.split(" ").slice(1).join(" ") ?? "");
                  setProfileEmail(me.email ?? "");
                }}
                className="text-xs font-medium text-hgh-muted hover:text-hgh-navy"
              >
                Discard
              </button>
            )}
            <Button
              onClick={() => void handleSaveProfile()}
              disabled={!profileDirty || profileSaving}
            >
              {profileSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Sign-in & password ───────────────────────────────────────────── */}
      <Card className={cn("mt-4", settingsPanelClass)}>
        <CardHeader className={cn("flex flex-row items-center gap-2", settingsPanelHeaderClass)}>
          <KeyRound className="text-hgh-gold" size={20} aria-hidden />
          <CardTitle className="text-base text-zinc-900">Sign-in &amp; password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-hgh-muted">
          <p>
            Use a strong password. In Supabase you can turn on MFA for your email — see your project’s{" "}
            <span className="font-medium text-hgh-navy">Authentication → Providers</span> settings.
          </p>
          <Link
            href={`/update-password?returnTo=${encodeURIComponent(changePasswordReturnTo)}`}
            className="inline-flex text-sm font-medium text-hgh-gold underline-offset-2 hover:underline"
          >
            Change password
          </Link>
        </CardContent>
      </Card>
      <Card id="referrals" className={cn("mt-4 scroll-mt-24", settingsPanelClass)}>
        <CardHeader className={cn("flex flex-row items-center gap-2", settingsPanelHeaderClass)}>
          <CardTitle className="text-base text-zinc-900">Referrals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-hgh-muted">
          <p>
            Share your link or code with another organisation owner. When they create a workspace with it and
            complete subscription checkout, your company receives one extra month of full access (stackable).
          </p>
          {referralInviteUrl ? (
            <div className="rounded-lg border border-hgh-border/80 bg-hgh-offwhite/50 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-hgh-muted">Invite link</p>
              <div className="mt-1.5 flex flex-wrap items-start gap-2">
                <p className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-hgh-navy">
                  {referralInviteUrl}
                </p>
                <CopyIconButton
                  text={referralInviteUrl}
                  label="Copy invite link"
                  hint="Full URL for new sign-ups; your referral code is added automatically."
                  className="shrink-0"
                />
              </div>
              <p className="mt-2 text-xs text-hgh-muted">
                Opens sign-up with your code. They sign in afterward and land on onboarding with the code
                pre-filled.
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-hgh-slate">Code</span>
            <span className="rounded-md bg-hgh-offwhite px-3 py-1.5 font-mono text-sm font-semibold text-hgh-navy">
              {me?.referralCode ?? "—"}
            </span>
            {me?.referralCode ? (
              <CopyIconButton
                text={me.referralCode}
                label="Copy referral code"
                hint="Copy your HGH referral code to send by email or chat."
              />
            ) : null}
          </div>
          <div className="grid gap-1 border-t border-hgh-border/80 pt-3 sm:grid-cols-2">
            <p>
              <span className="font-medium text-hgh-slate">Successful referrals:</span> {me?.referralCount ?? 0}
            </p>
            <p>
              <span className="font-medium text-hgh-slate">Months earned:</span>{" "}
              {me?.referralMonthsEarned ?? 0}
            </p>
          </div>
        </CardContent>
      </Card>
      </section>
      )}

      </div>

      {active === "taxes" && (
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={
          payeScope === "global" ? "Edit platform default PAYE brackets" : "Edit PAYE tax brackets"
        }
        className="max-w-2xl"
      >
        {payeScope === "global" && (
          <p className="mb-4 rounded-lg border-2 border-amber-300/80 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-950">
            Saving updates the <strong>global default</strong> used when a company has no company-specific brackets.
          </p>
        )}
        <p className="mb-3 text-sm text-hgh-slate">
          Set monthly bands in <strong>GHS</strong> and the rate for each band. Leave “To” empty for the top open-ended
          bracket.
        </p>
        <div className="max-h-[min(24rem,55vh)] space-y-3 overflow-y-auto overscroll-contain pr-1">
          {brackets.map((b, i) => (
            <div
              key={i}
              className="rounded-xl border-2 border-hgh-border bg-hgh-offwhite/60 p-3 shadow-sm"
            >
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-hgh-navy">
                Band {i + 1}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-hgh-muted" htmlFor={`paye-min-${i}`}>
                    From (GHS)
                  </label>
                  <Input
                    id={`paye-min-${i}`}
                    type="number"
                    value={b.minAmount}
                    onChange={(e) => handleBracketChange(i, "minAmount", e.target.value)}
                    className="border-hgh-border font-medium"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-hgh-muted" htmlFor={`paye-max-${i}`}>
                    To (GHS)
                  </label>
                  <Input
                    id={`paye-max-${i}`}
                    type="number"
                    value={b.maxAmount ?? ""}
                    placeholder="No limit"
                    onChange={(e) => handleBracketChange(i, "maxAmount", e.target.value)}
                    className="border-hgh-border font-medium"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-hgh-muted" htmlFor={`paye-rate-${i}`}>
                    Rate (%)
                  </label>
                  <Input
                    id={`paye-rate-${i}`}
                    type="number"
                    step="0.5"
                    value={b.ratePercent}
                    onChange={(e) => handleBracketChange(i, "ratePercent", e.target.value)}
                    className="border-hgh-border font-medium"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-hgh-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="md" onClick={() => setEditOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="md"
            onClick={() => void handleSaveBrackets()}
            disabled={savingBrackets || (payeScope === "company" && !selected)}
          >
            {savingBrackets ? "Saving…" : "Save brackets"}
          </Button>
        </div>
      </Dialog>
      )}
    </>
  );
}
