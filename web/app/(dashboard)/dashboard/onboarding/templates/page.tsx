"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { ArrowLeft, FileStack, Sparkles } from "lucide-react";
import { ONBOARDING_STARTER_TEMPLATES } from "@/lib/onboarding-suggestions";

type ApiTemplate = {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  _count: { tasks: number };
};

export default function OnboardingTemplatesManagePage() {
  const router = useRouter();
  const { selected } = useCompany();
  const { data: templates } = useApi<ApiTemplate[]>(
    selected ? `/api/onboarding-tracker/templates?companyId=${selected.id}` : null,
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/onboarding")}>
          <ArrowLeft size={18} />
          Back
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-hgh-navy">Onboarding templates</h2>
          <p className="text-sm text-hgh-muted">
            Start from a ready-made example, then adjust tasks—or build a custom template from scratch.
          </p>
        </div>
        <Link href="/dashboard/onboarding/templates/new">
          <Button>Create custom template</Button>
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-hgh-gold" aria-hidden />
          <h3 className="text-sm font-semibold text-hgh-navy">Ready-made starters</h3>
        </div>
        <p className="text-xs text-hgh-muted">
          These are not saved until you create the template. Select one to open the editor with tasks
          pre-filled; you can still rename and edit everything.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ONBOARDING_STARTER_TEMPLATES.map((starter) => (
            <div
              key={starter.id}
              className="flex flex-col rounded-xl border border-hgh-border bg-white p-4 shadow-sm"
            >
              <p className="font-medium text-hgh-navy">{starter.name}</p>
              <p className="mt-1 flex-1 text-xs text-hgh-muted">{starter.summary}</p>
              <p className="mt-2 text-[11px] text-hgh-slate">
                {starter.tasks.length} suggested tasks
              </p>
              <HintTooltip content="Opens the new template form with this checklist filled in.">
                <Link
                  href={`/dashboard/onboarding/templates/new?starter=${encodeURIComponent(starter.id)}`}
                  className="mt-3"
                >
                  <Button variant="secondary" size="sm" className="w-full">
                    Use this starter
                  </Button>
                </Link>
              </HintTooltip>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FileStack className="h-4 w-4 text-hgh-navy" aria-hidden />
          <h3 className="text-sm font-semibold text-hgh-navy">Your company templates</h3>
        </div>
        {!selected ? (
          <p className="text-sm text-hgh-muted">Select a workspace to list templates.</p>
        ) : !templates ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-hgh-border/40" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-hgh-border bg-hgh-offwhite/30 px-4 py-8 text-center text-sm text-hgh-muted">
            No saved templates yet. Pick a starter above or create a custom template.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-hgh-border bg-white">
            <ul className="divide-y divide-hgh-border">
              {templates.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-hgh-navy">{t.name}</p>
                    <p className="text-xs text-hgh-muted">
                      {t._count.tasks} task{t._count.tasks === 1 ? "" : "s"} · saved{" "}
                      {new Date(t.createdAt).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {t.isDefault ? (
                      <Badge variant="success">Default</Badge>
                    ) : null}
                    <Link href={`/dashboard/onboarding/templates/${encodeURIComponent(t.id)}`}>
                      <Button variant="secondary" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <HintTooltip content="Create another template using the same task list as a starting point.">
                      <Link href={`/dashboard/onboarding/templates/new?from=${encodeURIComponent(t.id)}`}>
                        <Button variant="ghost" size="sm">
                          Duplicate as new
                        </Button>
                      </Link>
                    </HintTooltip>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
