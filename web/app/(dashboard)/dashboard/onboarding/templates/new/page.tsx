"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";
import { useToast } from "@/components/toast/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SmartTextField } from "@/components/ui/smart-text-field";
import { TemplateComboInput } from "@/components/ui/TemplateComboInput";
import { DueDayPresetSelect } from "@/components/onboarding/due-day-preset-select";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import {
  TEMPLATE_NAME_SUGGESTIONS,
  TASK_TITLE_SUGGESTIONS,
  TASK_DESCRIPTION_SUGGESTIONS,
  DUE_DAY_PRESETS,
  ONBOARDING_STARTER_TEMPLATES,
  getOnboardingStarterById,
} from "@/lib/onboarding-suggestions";

type TaskItem = {
  id: string;
  title: string;
  description: string;
  dueAfterDays: number;
  isRequired: boolean;
};

type ApiTemplateRow = { id: string; name: string };

let nextId = 1;

function NewTemplatePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const starterParam = searchParams.get("starter");
  const fromTemplateId = searchParams.get("from");
  const { selected } = useCompany();
  const { toast } = useToast();
  const { data: savedTemplates } = useApi<ApiTemplateRow[]>(
    selected ? `/api/onboarding-tracker/templates?companyId=${selected.id}` : null,
  );
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [startingPoint, setStartingPoint] = useState<string>(
    fromTemplateId ? `from:${fromTemplateId}` : starterParam ? `starter:${starterParam}` : "custom",
  );
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) return;

    async function seed() {
      if (fromTemplateId) {
        const res = await fetch(`/api/onboarding-tracker/templates/${encodeURIComponent(fromTemplateId)}`);
        if (!res.ok) {
          toast.error("Could not load template to duplicate.");
          return;
        }
        const data = (await res.json()) as {
          name: string;
          tasks: { title: string; description?: string; dueAfterDays: number; isRequired: boolean }[];
        };
        setName(`Copy of ${data.name}`);
        setIsDefault(false);
        setTasks(
          data.tasks.map((t) => ({
            id: `new-${nextId++}`,
            title: t.title,
            description: t.description ?? "",
            dueAfterDays: t.dueAfterDays,
            isRequired: t.isRequired,
          })),
        );
        setStartingPoint(`from:${fromTemplateId}`);
        seededRef.current = true;
        return;
      }

      const starter = getOnboardingStarterById(starterParam);
      if (starter) {
        setName(starter.name);
        setIsDefault(starter.suggestDefault);
        setTasks(
          starter.tasks.map((t) => ({
            id: `new-${nextId++}`,
            title: t.title,
            description: t.description,
            dueAfterDays: t.dueAfterDays,
            isRequired: t.isRequired,
          })),
        );
        setStartingPoint(`starter:${starter.id}`);
        seededRef.current = true;
      }
    }

    void seed();
  }, [fromTemplateId, starterParam, toast]);

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
      router.push("/dashboard/onboarding/templates");
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to create template");
    }
  };

  const applyStartingPoint = (value: string) => {
    setStartingPoint(value);
    if (value === "custom") return;
    if (value.startsWith("starter:")) {
      const id = value.slice("starter:".length);
      const starter = getOnboardingStarterById(id);
      if (!starter) return;
      setName(starter.name);
      setIsDefault(starter.suggestDefault);
      setTasks(
        starter.tasks.map((t) => ({
          id: `new-${nextId++}`,
          title: t.title,
          description: t.description,
          dueAfterDays: t.dueAfterDays,
          isRequired: t.isRequired,
        })),
      );
      return;
    }
    if (value.startsWith("from:")) {
      const id = value.slice("from:".length);
      void (async () => {
        const res = await fetch(`/api/onboarding-tracker/templates/${encodeURIComponent(id)}`);
        if (!res.ok) {
          toast.error("Could not load that template.");
          return;
        }
        const data = (await res.json()) as {
          name: string;
          tasks: { title: string; description?: string; dueAfterDays: number; isRequired: boolean }[];
        };
        setName(`Copy of ${data.name}`);
        setIsDefault(false);
        setTasks(
          data.tasks.map((t) => ({
            id: `new-${nextId++}`,
            title: t.title,
            description: t.description ?? "",
            dueAfterDays: t.dueAfterDays,
            isRequired: t.isRequired,
          })),
        );
      })();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/onboarding/templates")}>
          <ArrowLeft size={18} />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">New onboarding template</h2>
          <p className="text-sm text-hgh-muted">Pick a starting point, then use examples or type your own.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Starting point</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-hgh-muted">
            Reload tasks from a starter or duplicate an existing saved template. Your edits below are kept
            until you change this.
          </p>
          <Select value={startingPoint} onValueChange={(v) => applyStartingPoint(v)}>
            <SelectTrigger hideLeadingIcon className="max-w-md">
              <SelectValue placeholder="Choose starting point" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Blank (custom only)</SelectItem>
              {ONBOARDING_STARTER_TEMPLATES.map((s) => (
                <SelectItem key={s.id} value={`starter:${s.id}`}>
                  Starter: {s.name}
                </SelectItem>
              ))}
              {savedTemplates?.map((t) => (
                <SelectItem key={t.id} value={`from:${t.id}`}>
                  Saved: {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TemplateComboInput
            label="Suggested names (pick then edit if needed)"
            value={name}
            onChange={setName}
            options={TEMPLATE_NAME_SUGGESTIONS}
            placeholder="Type template name"
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
              No tasks yet. Choose a starting point above or click &quot;Add task&quot;.
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
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Create template"}
        </Button>
      </div>
    </div>
  );
}

export default function NewTemplatePage() {
  return (
    <Suspense
      fallback={<div className="py-12 text-center text-sm text-hgh-muted">Loading template editor…</div>}
    >
      <NewTemplatePageInner />
    </Suspense>
  );
}
