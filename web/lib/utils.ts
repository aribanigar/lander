import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSalary(min: number, max: number, currency = "USD") {
  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
  const sym = currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : currency;
  if (!min && !max) return "Salary not specified";
  if (!max) return `${sym}${fmt(min)}+`;
  if (!min) return `Up to ${sym}${fmt(max)}`;
  return `${sym}${fmt(min)} – ${sym}${fmt(max)}`;
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    queued: "badge-muted",
    applied: "badge-blue",
    viewed: "badge-amber",
    replied: "badge-amber",
    positive: "badge-green",
    interview: "badge-green",
    offer: "badge-green",
    rejected: "badge-red",
    withdrawn: "badge-muted",
    failed: "badge-red",
  };
  return map[status] ?? "badge-muted";
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    queued: "Queued",
    applied: "Applied",
    viewed: "Viewed",
    replied: "Replied",
    positive: "Interested",
    interview: "Interview",
    offer: "Offer",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
    failed: "Failed",
  };
  return map[status] ?? status;
}

export function jobHireRate(applied: number, interviews: number): number {
  if (applied === 0) return 0;
  return Math.round((interviews / applied) * 100);
}

export function projectedOfferDays(
  dailyApplied: number,
  interviewRate: number,
  offerRate = 0.25
): number {
  if (dailyApplied === 0 || interviewRate === 0) return 90;
  // Assumes ~3 interviews to get 1 offer
  const interviewsNeeded = Math.ceil(1 / offerRate);
  const applicationsNeeded = Math.ceil(interviewsNeeded / (interviewRate / 100));
  return Math.ceil(applicationsNeeded / dailyApplied);
}
