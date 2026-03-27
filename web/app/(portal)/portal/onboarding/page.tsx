"use client";

import { useApi } from "@/lib/swr";
import { Badge } from "@/components/ui/badge";

type Task = {
  id: string;
  title: string;
  dueDate: string;
  isRequired: boolean;
  status: "PENDING" | "COMPLETED" | "OVERDUE" | "WAIVED";
};

type Onboarding = {
  id: string;
  startDate: string;
  status: string;
  tasks: Task[];
};

const taskStatusBadge: Record<string, "default" | "success" | "warning" | "danger"> = {
  PENDING: "default",
  COMPLETED: "success",
  OVERDUE: "danger",
  WAIVED: "warning",
};

export default function PortalOnboardingPage() {
  const { data: onboarding } = useApi<Onboarding>("/api/me/onboarding");

  if (!onboarding) {
    return (
      <div className="py-10 text-center text-sm text-hgh-muted">
        No onboarding checklist assigned to you.
      </div>
    );
  }

  const total = onboarding.tasks.length;
  const done = onboarding.tasks.filter(
    (t) => t.status === "COMPLETED" || t.status === "WAIVED",
  ).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-hgh-navy">My Onboarding</h2>
        <p className="text-sm text-hgh-muted">
          Track your onboarding progress. Complete tasks as assigned.
        </p>
      </div>

      <div className="rounded-xl border border-hgh-border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-hgh-navy">
            {done} of {total} tasks completed
          </span>
          <span className="text-xs text-hgh-muted">{pct}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-hgh-border">
          <div
            className="h-full rounded-full bg-hgh-gold transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {onboarding.tasks.map((task) => {
          const isOverdue =
            task.status === "PENDING" && new Date(task.dueDate) < new Date();
          return (
            <div
              key={task.id}
              className={`rounded-xl border bg-white p-4 ${
                isOverdue ? "border-hgh-danger/20" : "border-hgh-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-hgh-navy">{task.title}</p>
                <Badge variant={taskStatusBadge[task.status] ?? "default"}>
                  {task.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-hgh-muted">
                Due: {new Date(task.dueDate).toLocaleDateString("en-GH")}
                {task.isRequired && <span className="ml-2 text-hgh-danger">Required</span>}
                {isOverdue && <span className="ml-2 font-medium text-hgh-danger">OVERDUE</span>}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
