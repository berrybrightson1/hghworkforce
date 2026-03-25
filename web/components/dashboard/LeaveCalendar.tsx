"use client";

import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { employeeDisplayName } from "@/lib/employee-display";

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  employee?: {
    employeeCode: string;
    name?: string | null;
    user?: { name: string } | null;
  };
}

export function LeaveCalendar({ requests }: { requests: LeaveRequest[] }) {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  const getRequestsForDay = (day: Date) => {
    return requests.filter(r => {
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      return day >= start && day <= end && r.status === "APPROVED";
    });
  };

  return (
    <div className="rounded-xl border border-hgh-border bg-white overflow-hidden">
      <div className="grid grid-cols-7 border-b border-hgh-border bg-hgh-offwhite">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-hgh-muted uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayRequests = getRequestsForDay(day);
          const isCurrentMonth = day >= monthStart && day <= monthEnd;

          return (
            <div
              key={i}
              className={`min-h-[100px] border-r border-b border-hgh-border p-2 transition-colors ${
                !isCurrentMonth ? "bg-hgh-offwhite/30" : "bg-white"
              } ${isSameDay(day, today) ? "bg-blue-50/30" : ""}`}
            >
              <span className={`text-xs font-medium ${isCurrentMonth ? "text-hgh-navy" : "text-hgh-muted"}`}>
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-1">
                {dayRequests.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium bg-hgh-navy text-white"
                    title={`${r.employee ? employeeDisplayName(r.employee) : "?"} (${r.employee?.employeeCode}): ${r.type}`}
                  >
                    {r.employee ? employeeDisplayName(r.employee) : "—"}
                  </div>
                ))}
                {dayRequests.length > 3 && (
                  <div className="text-[10px] text-hgh-muted font-medium px-1">
                    +{dayRequests.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
