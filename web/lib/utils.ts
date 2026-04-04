import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Loan helper: amount / months, rounded to 2 decimals. */
export function monthlyRepaymentFromTerm(amount: number, months: number): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (!Number.isFinite(months) || months < 1 || !Number.isInteger(months)) return null;
  return Math.round((amount / months) * 100) / 100;
}
