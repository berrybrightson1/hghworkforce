"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";
import { useToast } from "@/components/toast/useToast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Task = {
  id: string;
  title: string;
  dueDate: string;
  isRequired: boolean;
  status: "PENDING" | "COMPLETED" | "OVERDUE" | "WAIVED";
  completedAt: string | null;
  waivedNote: string | null;
};

type OnboardingDetail = {
  id: string;
  employeeId: string;
  startDate: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  employee: { name: string | null; employeeCode: string };
  tasks: Task[];
};

const taskStatusBadge: Record<string, "default" | "success" | "warning" | "danger"> = {
  PENDING: "default",
  COMPLETED: "success",
  OVERDUE: "danger",
  WAIVED: "warning",
};

export default function OnboardingDetailPage() {
  const params = useParams();
  const employeeId = params.employeeId as string;
  const router = useRouter();
  const { selected } = useCompany();
  const { toast } = useToast();
  const [waiveTaskId, setWaiveTaskId] = useState<string | null>(null);
  const [waiveNote, setWaiveNote] = useState("");

  const { data: onboardings, mutate } = useApi<OnboardingDetail[]>(
    selected ? `/api/onboarding-tracker?companyId=${selected.id}` : null,
  );

  const onboarding = onboardings?.find((o) => o.employeeId === employeeId);

  const handleAction = async (taskId: string, action: "complete-task" | "waive-task", note?: string) => {
    if (!onboarding) return;

    const res = await fetch(`/api/onboarding-tracker/${onboarding.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        action,
        ...(note ? { waivedNote: note } : {}),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (action === "complete-task") {
        toast.success("Task marked as complete");
      } else {
        toast.success("Task waived");
      }
      if (data.status === "COMPLETED") {
        toast.success(`${onboarding.employee.name ?? "Employee"}'s onboarding is complete`);
      }
      mutate();
      setWaiveTaskId(null);
      setWaiveNote("");
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to update task");
    }
  };

  if (!onboarding) {
    return (
      <div className="py-10 text-center text-sm text-hgh-muted">
        {onboardings ? "No onboarding record found for this employee." : "Loading..."}
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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/onboarding")}>
          <ArrowLeft size={18} />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">
            {onboarding.employee.name ?? onboarding.employee.employeeCode} - Onboarding
          </h2>
          <p className="text-sm text-hgh-muted">
            Started {new Date(onboarding.startDate).toLocaleDateString("en-GH")}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-hgh-border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-hgh-navy">
            Progress: {done} of {total} tasks
          </span>
          <Badge
            variant={
              (taskStatusBadge[onboarding.status] as "default" | "success" | "warning" | "danger") ??
              "default"
            }
          >
            {onboarding.status.replace("_", " ")}
          </Badge>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-hgh-border">
          <div
            className="h-full rounded-full bg-hgh-gold transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {onboarding.tasks.map((task) => {
          const isOverdue =
            task.status === "PENDING" && new Date(task.dueDate) < new Date();
          return (
            <div
              key={task.id}
              className={`flex flex-wrap items-center gap-4 rounded-xl border bg-white p-4 ${
                isOverdue ? "border-hgh-danger/20" : "border-hgh-border"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-hgh-navy">{task.title}</p>
                <p className="text-xs text-hgh-muted">
                  Due: {new Date(task.dueDate).toLocaleDateString("en-GH")}
                  {task.isRequired && (
                    <span className="ml-2 text-hgh-danger">Required</span>
                  )}
                  {isOverdue && (
                    <span className="ml-2 font-medium text-hgh-danger">OVERDUE</span>
                  )}
                </p>
                {task.waivedNote && (
                  <p className="mt-1 text-xs text-hgh-muted italic">
                    Waived: {task.waivedNote}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={taskStatusBadge[task.status] ?? "default"}>
                  {task.status}
                </Badge>
                {task.status === "PENDING" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleAction(task.id, "complete-task")}
                    >
                      Complete
                    </Button>
                    {waiveTaskId === task.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={waiveNote}
                          onChange={(e) => setWaiveNote(e.target.value)}
                          placeholder="Reason for waiving"
                          className="h-8 w-48 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!waiveNote.trim()}
                          onClick={() => handleAction(task.id, "waive-task", waiveNote)}
                        >
                          Confirm
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setWaiveTaskId(task.id)}
                      >
                        Waive
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
