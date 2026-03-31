"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast/useToast";

export default function PortalFeedbackPage() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hgh-gold/15 text-hgh-gold">
          <MessageSquare size={22} aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-hgh-navy">Anonymous feedback</h1>
          <p className="mt-1 text-sm text-hgh-muted">
            Submissions are not attributed to you in the HR inbox.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Send feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} />
          <textarea
            className="w-full rounded-lg border border-hgh-border px-3 py-2 text-sm"
            rows={5}
            placeholder="Your message (min 10 characters)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button
            type="button"
            disabled={busy || message.trim().length < 10}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await fetch("/api/me/anonymous-feedback", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    message: message.trim(),
                    category: category.trim() || undefined,
                  }),
                });
                if (!res.ok) throw new Error();
                toast.success("Thank you — HR can review this in the dashboard.");
                setMessage("");
                setCategory("");
              } catch {
                toast.error("Could not send");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Sending…" : "Submit"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
