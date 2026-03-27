"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useApi } from "@/lib/swr";
import { useToast } from "@/components/toast/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  weight: number;
  selfScore: number | null;
  managerScore: number | null;
};

type ReviewDetail = {
  id: string;
  status: "PENDING" | "SELF_REVIEWED" | "MANAGER_REVIEWED" | "COMPLETED";
  selfRating: number | null;
  managerRating: number | null;
  finalRating: number | null;
  selfComment: string | null;
  managerComment: string | null;
  employee: { name: string | null; employeeCode: string; department: string };
  goals: Goal[];
  cycle: { name: string; periodStart: string; periodEnd: string };
};

export default function ReviewDetailPage() {
  const params = useParams();
  const reviewId = params.reviewId as string;
  const router = useRouter();
  const { toast } = useToast();

  const { data: review, mutate } = useApi<ReviewDetail>(
    reviewId ? `/api/performance/reviews/${reviewId}` : null,
  );

  const [goalScores, setGoalScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [newGoals, setNewGoals] = useState<{ title: string; weight: number }[]>([]);
  const [busy, setBusy] = useState(false);

  if (!review) {
    return <div className="py-10 text-center text-sm text-hgh-muted">Loading...</div>;
  }

  const handleAddGoals = async () => {
    const totalWeight = newGoals.reduce((s, g) => s + g.weight, 0);
    if (totalWeight !== 100) {
      toast.error("Goal weights must sum to 100%");
      return;
    }

    setBusy(true);
    const res = await fetch(`/api/performance/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-goals", goals: newGoals }),
    });
    setBusy(false);

    if (res.ok) {
      toast.success("Goals added");
      mutate();
      setNewGoals([]);
    } else {
      toast.error("Failed to add goals");
    }
  };

  const handleManagerReview = async () => {
    const goals = review.goals.map((g) => ({
      id: g.id,
      managerScore: goalScores[g.id] ?? g.managerScore ?? 3,
      weight: g.weight,
    }));

    setBusy(true);
    const res = await fetch(`/api/performance/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "manager-review",
        goals,
        managerComment: comment || undefined,
      }),
    });
    setBusy(false);

    if (res.ok) {
      toast.success("Manager review submitted");
      mutate();
    } else {
      toast.error("Failed to submit review");
    }
  };

  const handleComplete = async () => {
    setBusy(true);
    const res = await fetch(`/api/performance/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });
    setBusy(false);

    if (res.ok) {
      const data = await res.json();
      toast.success(`Review completed. Final rating: ${data.finalRating.toFixed(1)}`);
      mutate();
    } else {
      toast.error("Failed to complete review");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft size={18} />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">
            {review.employee.name ?? review.employee.employeeCode} - Review
          </h2>
          <p className="text-sm text-hgh-muted">
            {review.cycle.name} · {review.employee.department}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge
          variant={
            review.status === "COMPLETED"
              ? "success"
              : review.status === "PENDING"
                ? "default"
                : "warning"
          }
        >
          {review.status.replace("_", " ")}
        </Badge>
        {review.finalRating !== null && (
          <span className="text-sm font-medium text-hgh-navy">
            Final: {review.finalRating.toFixed(1)} / 5
          </span>
        )}
      </div>

      {/* Goals */}
      {review.goals.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Add Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-hgh-muted">
              Add goals with weights that sum to 100%. Each goal will be scored 1-5.
            </p>
            {newGoals.map((g, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={g.title}
                  onChange={(e) => {
                    const updated = [...newGoals];
                    updated[idx].title = e.target.value;
                    setNewGoals(updated);
                  }}
                  placeholder="Goal title"
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={g.weight}
                  onChange={(e) => {
                    const updated = [...newGoals];
                    updated[idx].weight = parseInt(e.target.value) || 0;
                    setNewGoals(updated);
                  }}
                  className="w-24"
                  placeholder="%"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setNewGoals((prev) => prev.filter((_, i) => i !== idx))}
                >
                  Remove
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setNewGoals((prev) => [...prev, { title: "", weight: 0 }])}
              >
                Add Goal
              </Button>
              {newGoals.length > 0 && (
                <Button size="sm" onClick={handleAddGoals} disabled={busy}>
                  Save Goals ({newGoals.reduce((s, g) => s + g.weight, 0)}%)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Goals & Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {review.goals.map((goal) => (
                <div
                  key={goal.id}
                  className="rounded-lg border border-hgh-border bg-hgh-offwhite/30 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-hgh-navy">{goal.title}</p>
                    <span className="text-xs text-hgh-muted">Weight: {goal.weight}%</span>
                  </div>
                  {goal.description && (
                    <p className="mt-1 text-xs text-hgh-muted">{goal.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-4">
                    <div>
                      <span className="text-[10px] uppercase text-hgh-muted">Self</span>
                      <p className="text-sm font-medium text-hgh-slate">
                        {goal.selfScore !== null ? `${goal.selfScore}/5` : "--"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-hgh-muted">Manager</span>
                      {review.status === "SELF_REVIEWED" || review.status === "PENDING" ? (
                        <select
                          value={goalScores[goal.id] ?? goal.managerScore ?? ""}
                          onChange={(e) =>
                            setGoalScores((prev) => ({
                              ...prev,
                              [goal.id]: parseInt(e.target.value),
                            }))
                          }
                          className="mt-0.5 block h-8 rounded border border-hgh-border bg-white px-2 text-sm"
                        >
                          <option value="">--</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm font-medium text-hgh-slate">
                          {goal.managerScore !== null ? `${goal.managerScore}/5` : "--"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(review.status === "SELF_REVIEWED" || review.status === "PENDING") && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-hgh-slate">
                    Manager Comment
                  </label>
                  <Input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Optional feedback"
                  />
                </div>
                <Button onClick={handleManagerReview} disabled={busy}>
                  {busy ? "Submitting..." : "Submit Manager Review"}
                </Button>
              </div>
            )}

            {review.status === "MANAGER_REVIEWED" && (
              <div className="mt-4">
                <Button onClick={handleComplete} disabled={busy}>
                  {busy ? "Completing..." : "Complete Review"}
                </Button>
              </div>
            )}

            {review.selfComment && (
              <p className="mt-4 text-sm text-hgh-muted">
                <span className="font-medium">Employee:</span> {review.selfComment}
              </p>
            )}
            {review.managerComment && (
              <p className="mt-2 text-sm text-hgh-muted">
                <span className="font-medium">Manager:</span> {review.managerComment}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
