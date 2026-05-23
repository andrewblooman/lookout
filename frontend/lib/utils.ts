import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function severityColor(severity: string | null | undefined): string {
  switch (severity?.toLowerCase()) {
    case "critical": return "severity-critical";
    case "high": return "severity-high";
    case "medium": return "severity-medium";
    case "low": return "severity-low";
    default: return "text-slate-400";
  }
}

export function severityBg(severity: string | null | undefined): string {
  switch (severity?.toLowerCase()) {
    case "critical": return "severity-bg-critical";
    case "high": return "severity-bg-high";
    case "medium": return "severity-bg-medium";
    case "low": return "severity-bg-low";
    default: return "bg-slate-800/50 border-slate-700";
  }
}

export function relativeTime(date: string | Date | null | undefined): string {
  if (!date) return "unknown";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}
