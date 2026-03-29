/**
 * Quick-pick shift templates for HR (Ghana-style office & common patterns).
 * Each row fills name, start/end, and break; users can still edit after selecting.
 */
export type ShiftQuickPick = {
  id: string;
  label: string;
  /** Shown under the label in the dropdown */
  description: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
};

export const SHIFT_QUICK_PICK_CUSTOM = "__custom__" as const;

export const SHIFT_QUICK_PICKS: ShiftQuickPick[] = [
  {
    id: "morning-office",
    label: "Morning office (standard)",
    description: "08:00–17:00 · 60 min break",
    name: "Morning office",
    startTime: "08:00",
    endTime: "17:00",
    breakMinutes: 60,
  },
  {
    id: "early-shift",
    label: "Early shift",
    description: "06:00–14:00 · 30 min break",
    name: "Early shift",
    startTime: "06:00",
    endTime: "14:00",
    breakMinutes: 30,
  },
  {
    id: "day-shift",
    label: "Day shift",
    description: "07:00–15:00 · 30 min break",
    name: "Day shift",
    startTime: "07:00",
    endTime: "15:00",
    breakMinutes: 30,
  },
  {
    id: "afternoon",
    label: "Afternoon / swing",
    description: "14:00–22:00 · 30 min break",
    name: "Afternoon shift",
    startTime: "14:00",
    endTime: "22:00",
    breakMinutes: 30,
  },
  {
    id: "night",
    label: "Night shift",
    description: "22:00–06:00 · 30 min break",
    name: "Night shift",
    startTime: "22:00",
    endTime: "06:00",
    breakMinutes: 30,
  },
  {
    id: "retail-full",
    label: "Retail / front desk (full day)",
    description: "09:00–18:00 · 45 min break",
    name: "Front desk",
    startTime: "09:00",
    endTime: "18:00",
    breakMinutes: 45,
  },
  {
    id: "half-day-am",
    label: "Half day (morning)",
    description: "08:00–12:30 · 0 min",
    name: "Half day — morning",
    startTime: "08:00",
    endTime: "12:30",
    breakMinutes: 0,
  },
  {
    id: "half-day-pm",
    label: "Half day (afternoon)",
    description: "13:00–17:00 · 0 min",
    name: "Half day — afternoon",
    startTime: "13:00",
    endTime: "17:00",
    breakMinutes: 0,
  },
  {
    id: "security-12",
    label: "Security / 12-hour day",
    description: "06:00–18:00 · 60 min break",
    name: "12-hour day roster",
    startTime: "06:00",
    endTime: "18:00",
    breakMinutes: 60,
  },
];
