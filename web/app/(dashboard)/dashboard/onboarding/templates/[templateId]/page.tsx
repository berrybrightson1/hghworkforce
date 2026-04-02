"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SmartTextField } from "@/components/ui/smart-text-field";
import { DueDayPresetSelect } from "@/components/onboarding/due-day-preset-select";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import {
  TEMPLATE_NAME_SUGGESTIONS,
  TASK_TITLE_SUGGESTIONS,
  TASK_DESCRIPTION_SUGGESTIONS,
  DUE_DAY_PRESETS,
} from "@/lib/onboarding-suggestions";

type TaskItem = {
  id: string;
  title: string;
  description: string;
  dueAfterDays: number;
  isRequired: boolean;
};

let nextClientId = 1;

export default function EditOnboardingTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = typeof params.templateId === "string" ? params.templateId : null;
  const { selected } = useCompany();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!templateId) {
      setLoading(false);
      return;
    }

    if (!selected) {
      setLoading(true);
      return;
    }

    const id = templateId;
    const workspaceCompanyId = selected.id;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const res = await fetch(`/api/onboarding-tracker/templates/${encodeURIComponent(id)}`);
      if (cancelled) return;
      if (!res.ok) {
        toast.error("Could not load template.");
        setLoading(false);
        router.push("/dashboard/onboarding/templates");
        return;
      }
      const data = (await res.json()) as {
        companyId: string;
        name: string;
        isDefault: boolean;
        tasks: {
          id: string;
          title: string;
          description?: string;
          dueAfterDays: number;
          isRequired: boolean;
        }[];
      };
      if (cancelled) return;
      if (data.companyId !== workspaceCompanyId) {
        toast.error("This template belongs to another workspace.");
        setLoading(false);
        router.push("/dashboard/onboarding/templates");
        return;
      }
      setName(data.name);
      setIsDefault(data.isDefault);
      setTasks(
        data.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description ?? "",
          dueAfterDays: t.dueAfterDays,
          isRequired: t.isRequired,
        })),
      );
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [templateId, selected, router, toast]);

  const addTask = () => {
    setTasks((prev) => [
      ...prev,
      {
        id: `new-${nextClientId++}`,
        title: "",
        description: "",
        dueAfterDays: 7,
        isRequired: true,
      },
    ]);
  };

  const updateTask = (id: string, field: keyof TaskItem, value: string | number | boolean) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSave = async () => {
    if (!templateId || !selected || !name.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (tasks.length === 0) {
      toast.error("Add at least one task");
      return;
    }
    if (tasks.some((t) => !t.title.trim())) {
      toast.error("All tasks must have a title");
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/onboarding-tracker/templates/${encodeURIComponent(templateId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        isDefault,
        tasks: tasks.map((t) => {
          const row: {
            id?: string;
            title: string;
            description?: string;
            dueAfterDays: number;
            isRequired: boolean;
          } = {
            title: t.title,
            description: t.description || undefined,
            dueAfterDays: t.dueAfterDays,
            isRequired: t.isRequired,
          };
          if (!t.id.startsWith("new-")) {
            row.id = t.id;
          }
          return row;
        }),
      }),
    });
    setSaving(false);

    if (res.ok) {
      toast.success("Template updated");
      router.push("/dashboard/onboarding/templates");
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to update template");
    }
  };

  if (!templateId) {
    return (
      <p className="text-sm text-hgh-muted">Invalid template.</p>
    );
  }

  if (!selected) {
    return <p className="text-sm text-hgh-muted">Select a workspace to edit templates.</p>;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-hgh-border/40" />
        <div className="h-40 animate-pulse rounded-xl bg-hgh-border/30" />
        <div className="h-64 animate-pulse rounded-xl bg-hgh-border/30" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/onboarding/templates")}>
          <ArrowLeft size={18} />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">Edit onboarding template</h2>
          <p className="text-sm text-hgh-muted">Update the checklist. Existing employee onboardings keep their own copies of tasks.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SmartTextField
            label="Template name"
            value={name}
            onChange={setName}
            placeholder="e.g. Standard onboarding"
            suggestions={TEMPLATE_NAME_SUGGESTIONS}
          />
          <label className="flex items-center gap-2 text-sm text-hgh-slate">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-hgh-border text-hgh-gold"
            />
            Set as default template (auto-assigned to new employees)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tasks ({tasks.length})</CardTitle>
          <Button variant="secondary" size="sm" onClick={addTask}>
            <Plus size={16} />
            Add task
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-hgh-muted">
              No tasks yet. Click &quot;Add task&quot;.
            </p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex gap-3 rounded-lg border border-hgh-border bg-hgh-offwhite/30 p-4"
              >
                <div className="flex shrink-0 items-center text-hgh-muted">
                  <GripVertical size={16} />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <SmartTextField
                    label="Task title"
                    value={task.title}
                    onChange={(v) => updateTask(task.id, "title", v)}
                    placeholder="What should they complete?"
                    suggestions={TASK_TITLE_SUGGESTIONS}
                  />
                  <div className="flex flex-wrap gap-3">
                    <div className="min-w-[5rem] space-y-1">
                      <span className="block text-xs font-medium text-hgh-slate">Due (days after start)</span>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min={1}
                          className="w-20"
                          value={task.dueAfterDays}
                          onChange={(e) =>
                            updateTask(task.id, "dueAfterDays", parseInt(e.target.value, 10) || 1)
                          }
                        />
                        <DueDayPresetSelect
                          presets={DUE_DAY_PRESETS}
                          onPick={(days) => updateTask(task.id, "dueAfterDays", days)}
                        />
                      </div>
                    </div>
                  </div>
                  <SmartTextField
                    label="Description (optional)"
                    value={task.description}
                    onChange={(v) => updateTask(task.id, "description", v)}
                    placeholder="Extra detail for HR or the employee"
                    suggestions={TASK_DESCRIPTION_SUGGESTIONS}
                  />
                  <label className="flex items-center gap-2 text-xs text-hgh-slate">
                    <input
                      type="checkbox"
                      checked={task.isRequired}
                      onChange={(e) => updateTask(task.id, "isRequired", e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-hgh-border"
                    />
                    Required for completion
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => removeTask(task.id)}
                  className="shrink-0 self-start text-hgh-muted hover:text-hgh-danger"
                  aria-label="Remove task"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => router.push("/dashboard/onboarding/templates")}>
          Cancel
        </Button>
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
