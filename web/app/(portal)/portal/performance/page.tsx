"use client";

import { useState } from "react";
import { useApi } from "@/lib/swr";
import { useToast } from "@/components/toast/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Goal = {
  id: string;
  title: string;
  weight: number;
  selfScore: number | null;
  managerScore: number | null;
};

type Review = {
  id: string;
  status: "PENDING" | "SELF_REVIEWED" | "MANAGER_REVIEWED" | "COMPLETED";
  selfRating: number | null;
  finalRating: number | null;
  selfComment: string | null;
  cycle: { name: string; periodStart: string; periodEnd: string };
  goals: Goal[];
};

export default function PortalPerformancePage() {
  const { toast } = useToast();
  const { data: reviews, mutate } = useApi<Review[]>("/api/me/performance");
  const [goalScores, setGoalScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSelfReview = async (reviewId: string, goals: Goal[]) => {
    const scoredGoals = goals.map((g) => ({
      id: g.id,
      selfScore: goalScores[g.id] ?? g.selfScore ?? 3,
      weight: g.weight,
    }));

    setBusy(true);
    const res = await fetch(`/api/performance/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "self-review",
        goals: scoredGoals,
        selfComment: comment || undefined,
      }),
    });
    setBusy(false);

    if (res.ok) {
      toast.success("Self review submitted");
      mutate();
      setGoalScores({});
      setComment("");
    } else {
      toast.error("Failed to submit");
    }
  };

  if (!reviews) {
    return <div className="py-10 text-center text-sm text-hgh-muted">Loading...</div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-hgh-muted">
        No performance reviews assigned to you.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-hgh-navy">My Performance Reviews</h2>
        <p className="text-sm text-hgh-muted">View and submit your self-assessments.</p>
      </div>

      {reviews.map((review) => (
        <Card key={review.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{review.cycle.name}</CardTitle>
              <p className="text-xs text-hgh-muted">
                {new Date(review.cycle.periodStart).toLocaleDateString("en-GH")} &ndash;{" "}
                {new Date(review.cycle.periodEnd).toLocaleDateString("en-GH")}
              </p>
            </div>
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
          </CardHeader>
          <CardContent className="space-y-4">
            {review.finalRating !== null && (
              <p className="text-sm font-medium text-hgh-navy">
                Final Rating: {review.finalRating.toFixed(1)} / 5
              </p>
            )}

            {review.goals.length > 0 && (
              <div className="space-y-3">
                {review.goals.map((goal) => (
                  <div
                    key={goal.id}
                    className="rounded-lg border border-hgh-border bg-hgh-offwhite/30 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-hgh-navy">{goal.title}</p>
                      <span className="text-xs text-hgh-muted">{goal.weight}%</span>
                    </div>
                    <div className="mt-2 flex gap-4">
                      <div>
                        <span className="text-[10px] uppercase text-hgh-muted">Self</span>
                        {review.status === "PENDING" ? (
                          <Select
                            value={
                              goalScores[goal.id] !== undefined
                                ? String(goalScores[goal.id])
                                : undefined
                            }
                            onValueChange={(v) =>
                              setGoalScores((prev) => ({
                                ...prev,
                                [goal.id]: parseInt(v, 10),
                              }))
                            }
                          >
                            <SelectTrigger className="mt-0.5 h-8 w-[4.5rem] px-2" hideLeadingIcon>
                              <SelectValue placeholder="--" />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm">{goal.selfScore ?? "--"}/5</p>
                        )}
                      </div>
                      {review.status === "COMPLETED" && (
                        <div>
                          <span className="text-[10px] uppercase text-hgh-muted">Manager</span>
                          <p className="text-sm">{goal.managerScore ?? "--"}/5</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {review.status === "PENDING" && review.goals.length > 0 && (
              <div className="space-y-3">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Optional self-review comment"
                />
                <Button
                  onClick={() => handleSelfReview(review.id, review.goals)}
                  disabled={busy}
                >
                  {busy ? "Submitting..." : "Submit Self Review"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
