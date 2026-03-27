"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";

type TaskItem = {
  id: string;
  title: string;
  description: string;
  dueAfterDays: number;
  isRequired: boolean;
};

let nextId = 1;

export default function NewTemplatePage() {
  const router = useRouter();
  const { selected } = useCompany();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [saving, setSaving] = useState(false);

  const addTask = () => {
    setTasks((prev) => [
      ...prev,
      {
        id: `new-${nextId++}`,
        title: "",
        description: "",
        dueAfterDays: 7,
        isRequired: true,
      },
    ]);
  };

  const updateTask = (id: string, field: keyof TaskItem, value: string | number | boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSave = async () => {
    if (!selected || !name.trim()) {
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
    const res = await fetch("/api/onboarding-tracker/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: selected.id,
        name: name.trim(),
        isDefault,
        tasks: tasks.map((t) => ({
          title: t.title,
          description: t.description || undefined,
          dueAfterDays: t.dueAfterDays,
          isRequired: t.isRequired,
        })),
      }),
    });
    setSaving(false);

    if (res.ok) {
      toast.success("Template created");
      router.push("/dashboard/onboarding");
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to create template");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/onboarding")}>
          <ArrowLeft size={18} />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">New Onboarding Template</h2>
          <p className="text-sm text-hgh-muted">Create a reusable checklist for new hires.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-hgh-slate">Template Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Onboarding"
            />
          </div>
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
            Add Task
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-hgh-muted">
              No tasks yet. Click &quot;Add Task&quot; to get started.
            </p>
          ) : (
            tasks.map((task, idx) => (
              <div
                key={task.id}
                className="flex gap-3 rounded-lg border border-hgh-border bg-hgh-offwhite/30 p-4"
              >
                <div className="flex shrink-0 items-center text-hgh-muted">
                  <GripVertical size={16} />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <div className="min-w-0 flex-1">
                      <Input
                        value={task.title}
                        onChange={(e) => updateTask(task.id, "title", e.target.value)}
                        placeholder="Task title"
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        min={1}
                        value={task.dueAfterDays}
                        onChange={(e) =>
                          updateTask(task.id, "dueAfterDays", parseInt(e.target.value) || 1)
                        }
                        placeholder="Days"
                      />
                      <span className="text-[10px] text-hgh-muted">days after start</span>
                    </div>
                  </div>
                  <Input
                    value={task.description}
                    onChange={(e) => updateTask(task.id, "description", e.target.value)}
                    placeholder="Description (optional)"
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
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => router.push("/dashboard/onboarding")}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Create Template"}
        </Button>
      </div>
    </div>
  );
}
