"use client";

import { Bell } from "lucide-react";
import { useToast } from "@/components/toast/useToast";
import { Button } from "@/components/ui/button";

export function DemoToastTrigger() {
  const { toast } = useToast();
  return (
    <Button type="button" variant="secondary" onClick={() => toast.success("HGH toast is working.")}>
      <Bell size={18} />
      Show sample toast
    </Button>
  );
}
