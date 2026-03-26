"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Send, UserPlus } from "lucide-react";
import { useToast } from "@/components/toast/useToast";
import { useCompany } from "@/components/company-context";
import { Button } from "@/components/ui/button";
import { CopyIconButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@prisma/client";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  companyId: string | null;
  createdAt: string;
  company: { name: string } | null;
};

type InvitationRow = {
  id: string;
  email: string;
  role: UserRole;
  code: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  company: { name: string };
  inviter: { name: string; email: string };
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "COMPANY_ADMIN", label: "Company Admin" },
  { value: "HR", label: "HR" },
  { value: "EMPLOYEE", label: "Employee" },
];

function roleLabel(role: UserRole): string {
  const row = ROLE_OPTIONS.find((r) => r.value === role);
  if (row) return row.label;
  if (role === "SUPER_ADMIN") return "Super Admin";
  return role.replace(/_/g, " ");
}

const roleBadge: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-hgh-gold/15 text-hgh-gold",
  COMPANY_ADMIN: "bg-hgh-navy/10 text-hgh-navy",
  HR: "bg-hgh-success/10 text-hgh-success",
  EMPLOYEE: "bg-hgh-muted/10 text-hgh-muted",
};

export function UsersClient({
  currentUserRole,
  currentUserCompanyId,
}: {
  currentUserRole: UserRole;
  currentUserCompanyId: string | null;
}) {
  const { toast } = useToast();
  const { selected } = useCompany();
  const selectedCompanyId = currentUserRole === "SUPER_ADMIN" ? selected?.id : currentUserCompanyId;

  const [listScope, setListScope] = useState<"company" | "all">("company");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"users" | "invitations">("users");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("HR");
  const [inviting, setInviting] = useState(false);

  const showCompanyColumn =
    currentUserRole === "SUPER_ADMIN" && listScope === "all";
  const canInvite =
    Boolean(selectedCompanyId) &&
    (currentUserRole === "COMPANY_ADMIN" ||
      (currentUserRole === "SUPER_ADMIN" && listScope === "company"));

  const fetchData = useCallback(async () => {
    const isSuper = currentUserRole === "SUPER_ADMIN";
    if (isSuper && listScope === "company" && !selectedCompanyId) {
      setUsers([]);
      setInvitations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const usersUrl =
        isSuper && listScope === "all"
          ? "/api/users"
          : `/api/users?companyId=${encodeURIComponent(selectedCompanyId!)}`;

      const usersRes = await fetch(usersUrl);
      if (!usersRes.ok) {
        const err = await usersRes.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to load users");
        setUsers([]);
      } else {
        setUsers(await usersRes.json());
      }

      if (isSuper && listScope === "all") {
        setInvitations([]);
      } else {
        const invitesRes = await fetch(
          `/api/invitations?companyId=${encodeURIComponent(selectedCompanyId!)}`,
        );
        if (!invitesRes.ok) {
          const err = await invitesRes.json().catch(() => ({}));
          toast.error(err.error ?? "Failed to load invitations");
          setInvitations([]);
        } else {
          setInvitations(await invitesRes.json());
        }
      }
    } catch {
      toast.error("Network error loading users");
      setUsers([]);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserRole, listScope, selectedCompanyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRoleChange = async (userId: string, role: UserRole) => {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (res.ok) {
      toast.success("Role updated");
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to update role");
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isActive }),
    });
    if (res.ok) {
      toast.success(isActive ? "User activated" : "User deactivated");
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to update status");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;
    setInviting(true);
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole, companyId: selectedCompanyId }),
    });
    const data = await res.json();
    setInviting(false);

    if (res.ok) {
      toast.success(`Invitation created. Code: ${data.code}`);
      setInviteEmail("");
      fetchData();
    } else {
      toast.error(data.error ?? "Failed to send invitation");
    }
  };

  const handleRevoke = async (id: string) => {
    const res = await fetch("/api/invitations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "revoke" }),
    });
    if (res.ok) {
      toast.success("Invitation revoked");
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to revoke");
    }
  };

  const inviteRoleOptions = ROLE_OPTIONS.filter((r) => {
    if (currentUserRole === "COMPANY_ADMIN" && r.value === "COMPANY_ADMIN") return false;
    return true;
  });

  if (currentUserRole === "SUPER_ADMIN" && listScope === "company" && !selectedCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
        <UserPlus className="h-10 w-10 text-hgh-muted/50" aria-hidden />
        <p className="text-sm font-medium text-hgh-slate">Select a company</p>
        <p className="max-w-sm text-sm text-hgh-muted">
          Use the company switcher in the sidebar to choose an organization, then invite
          people or manage roles for that workspace.
        </p>
      </div>
    );
  }

  if (currentUserRole !== "SUPER_ADMIN" && !selectedCompanyId) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-hgh-muted">
        No company is assigned to your account. Contact a super admin.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-hgh-muted">
          Invite colleagues, assign roles, and review pending invitations. You cannot edit your
          own account from here.
        </p>
      </div>

      {currentUserRole === "SUPER_ADMIN" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-hgh-muted">
            User list
          </span>
          <div className="flex rounded-lg border border-hgh-border bg-hgh-border/30 p-0.5">
            <button
              type="button"
              onClick={() => {
                setListScope("company");
                setTab("users");
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                listScope === "company"
                  ? "bg-white text-hgh-navy shadow-sm"
                  : "text-hgh-muted hover:text-hgh-slate"
              }`}
            >
              This company
            </button>
            <button
              type="button"
              onClick={() => {
                setListScope("all");
                setTab("users");
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                listScope === "all"
                  ? "bg-white text-hgh-navy shadow-sm"
                  : "text-hgh-muted hover:text-hgh-slate"
              }`}
            >
              All users
            </button>
          </div>
        </div>
      )}

      {listScope === "all" && currentUserRole === "SUPER_ADMIN" && (
        <p className="rounded-lg border border-hgh-border bg-white px-4 py-3 text-sm text-hgh-muted">
          Platform-wide view. Switch to <strong className="text-hgh-slate">This company</strong>{" "}
          and pick a workspace to send invitations.
        </p>
      )}

      {canInvite && (
        <div className="rounded-xl border border-hgh-border bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-hgh-navy">Invite a team member</h2>
          <form onSubmit={handleInvite} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs font-medium text-hgh-slate" htmlFor="invite-email">
                Email address
              </label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                required
              />
            </div>
            <div className="w-full sm:w-48">
              <label className="mb-1 block text-xs font-medium text-hgh-slate" htmlFor="invite-role">
                Role
              </label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as UserRole)}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {inviteRoleOptions.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              disabled={inviting}
              className="inline-flex shrink-0 items-center gap-2 sm:mb-0"
            >
              {inviting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-hgh-navy/30 border-t-hgh-navy" />
              ) : (
                <Send className="h-[18px] w-[18px]" aria-hidden />
              )}
              Send invite
            </Button>
          </form>
        </div>
      )}

      <div className="flex gap-1 rounded-lg bg-hgh-border/40 p-1">
        <button
          type="button"
          onClick={() => setTab("users")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            tab === "users" ? "bg-white text-hgh-navy shadow-sm" : "text-hgh-muted hover:text-hgh-slate"
          }`}
        >
          Team members ({users.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("invitations")}
          disabled={listScope === "all"}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            tab === "invitations"
              ? "bg-white text-hgh-navy shadow-sm"
              : "text-hgh-muted hover:text-hgh-slate"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Invitations ({invitations.length})
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-hgh-border/30" />
          ))}
        </div>
      ) : tab === "users" ? (
        <div className="overflow-hidden rounded-xl border border-hgh-border bg-white">
          {users.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-hgh-muted">
              No users match this view. Invite someone or adjust filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-hgh-border bg-hgh-offwhite/50 text-left text-xs font-medium uppercase tracking-wider text-hgh-muted">
                    <th className="px-6 py-3">Name</th>
                    {showCompanyColumn && <th className="px-6 py-3">Company</th>}
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hgh-border">
                  {users.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-hgh-offwhite/30">
                      <td className="px-6 py-4">
                        <p className="font-medium text-hgh-navy">{u.name}</p>
                        <p className="text-xs text-hgh-muted">{u.email}</p>
                      </td>
                      {showCompanyColumn && (
                        <td className="px-6 py-4 text-hgh-slate">
                          {u.company?.name ?? "—"}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        {u.role === "SUPER_ADMIN" ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge[u.role]}`}
                          >
                            Super Admin
                          </span>
                        ) : (
                          <Select
                            value={u.role}
                            onValueChange={(v) => void handleRoleChange(u.id, v as UserRole)}
                          >
                            <SelectTrigger
                              className="h-8 min-w-[10.5rem] max-w-[12rem] px-2 text-xs text-hgh-slate"
                              aria-label={`Role for ${u.name}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="start">
                              {inviteRoleOptions.map((r) => (
                                <SelectItem key={r.value} value={r.value} className="text-xs">
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            u.isActive
                              ? "bg-hgh-success/10 text-hgh-success"
                              : "bg-hgh-danger/10 text-hgh-danger"
                          }`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {u.role !== "SUPER_ADMIN" && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(u.id, !u.isActive)}
                            className="text-xs font-medium text-hgh-muted transition-colors hover:text-hgh-navy"
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-hgh-border bg-white">
          {invitations.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-hgh-muted">No invitations sent yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-hgh-border bg-hgh-offwhite/50 text-left text-xs font-medium uppercase tracking-wider text-hgh-muted">
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Expires</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hgh-border">
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="transition-colors hover:bg-hgh-offwhite/30">
                      <td className="px-6 py-4">
                        <p className="font-medium text-hgh-navy">{inv.email}</p>
                        <p className="text-xs text-hgh-muted">
                          Invited by {inv.inviter?.name || inv.inviter?.email || "—"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge[inv.role]}`}
                        >
                          {roleLabel(inv.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex max-w-[240px] items-center gap-1">
                          <code className="min-w-0 flex-1 truncate rounded bg-hgh-offwhite px-2 py-0.5 font-mono text-xs text-hgh-slate">
                            {inv.code}
                          </code>
                          <CopyIconButton text={inv.code} label={`Copy invite code ${inv.code}`} />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-hgh-muted">
                        {format(new Date(inv.expiresAt), "d MMM yyyy")}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            inv.status === "PENDING"
                              ? "bg-hgh-gold/10 text-hgh-gold"
                              : inv.status === "ACCEPTED"
                                ? "bg-hgh-success/10 text-hgh-success"
                                : "bg-hgh-danger/10 text-hgh-danger"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {inv.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(inv.id)}
                            className="text-xs font-medium text-hgh-danger transition-colors hover:text-hgh-danger/80"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
