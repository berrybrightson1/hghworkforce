"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { useApi } from "@/lib/swr";
import { useToast } from "@/components/toast/useToast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HintTooltip } from "@/components/ui/hint-tooltip";

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
  managerRating: number | null;
  finalRating: number | null;
  employee: { name: string | null; employeeCode: string; department: string };
  goals: Goal[];
};

type CycleDetail = {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  reviews: Review[];
};

const reviewStatusBadge: Record<string, "default" | "success" | "warning" | "danger"> = {
  PENDING: "default",
  SELF_REVIEWED: "warning",
  MANAGER_REVIEWED: "warning",
  COMPLETED: "success",
};

function Stars({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-xs text-hgh-muted">--</span>;
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={16}
          fill={n <= Math.round(rating) ? "#C9A84C" : "none"}
          color={n <= Math.round(rating) ? "#C9A84C" : "#E2E8F0"}
        />
      ))}
      <span className="ml-1 text-xs text-hgh-muted">{rating.toFixed(1)}</span>
    </span>
  );
}

export default function CycleDetailPage() {
  const params = useParams();
  const cycleId = params.cycleId as string;
  const router = useRouter();
  const { toast } = useToast();
  const { data: cycle, mutate } = useApi<CycleDetail>(
    cycleId ? `/api/performance/cycles/${cycleId}` : null,
  );
  const [busy, setBusy] = useState(false);

  const handleActivate = async () => {
    setBusy(true);
    const res = await fetch(`/api/performance/cycles/${cycleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate" }),
    });
    setBusy(false);

    if (res.ok) {
      const data = await res.json();
      toast.success(`Cycle activated -- reviews created for ${data.reviewCount} employees`);
      mutate();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to activate");
    }
  };

  if (!cycle) {
    return <div className="py-10 text-center text-sm text-hgh-muted">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <HintTooltip content="Return to all performance cycles.">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/performance")}>
              <ArrowLeft size={18} />
              Back
            </Button>
          </HintTooltip>
          <div>
            <h2 className="text-xl font-semibold text-hgh-navy">{cycle.name}</h2>
            <p className="text-sm text-hgh-muted">
              {new Date(cycle.periodStart).toLocaleDateString("en-GH")} &ndash;{" "}
              {new Date(cycle.periodEnd).toLocaleDateString("en-GH")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={cycle.status === "ACTIVE" ? "warning" : cycle.status === "CLOSED" ? "success" : "default"}>
            {cycle.status}
          </Badge>
          {cycle.status === "DRAFT" && (
            <Button onClick={handleActivate} disabled={busy}>
              {busy ? "Activating..." : "Activate Cycle"}
            </Button>
          )}
        </div>
      </div>

      {cycle.reviews.length === 0 ? (
        <p className="py-10 text-center text-sm text-hgh-muted">
          {cycle.status === "DRAFT"
            ? "Activate this cycle to create reviews for all active employees."
            : "No reviews in this cycle."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-hgh-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-hgh-border bg-hgh-offwhite/50 text-left text-xs font-medium uppercase tracking-wider text-hgh-muted">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Self Rating</th>
                  <th className="px-4 py-3">Manager Rating</th>
                  <th className="px-4 py-3">Final Rating</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hgh-border">
                {cycle.reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-hgh-offwhite/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-hgh-navy">
                        {review.employee.name ?? review.employee.employeeCode}
                      </p>
                      <p className="text-xs text-hgh-muted">{review.employee.department}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={reviewStatusBadge[review.status] ?? "default"}>
                        {review.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Stars rating={review.selfRating} />
                    </td>
                    <td className="px-4 py-3">
                      <Stars rating={review.managerRating} />
                    </td>
                    <td className="px-4 py-3">
                      <Stars rating={review.finalRating} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <HintTooltip content="Open this employee’s review form and ratings.">
                        <Link
                          href={`/dashboard/performance/reviews/${review.id}`}
                          className="text-xs font-medium text-hgh-gold hover:underline"
                        >
                          Review
                        </Link>
                      </HintTooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
