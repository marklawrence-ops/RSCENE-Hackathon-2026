import type { DataStatus, Decision, Status } from "./types";

const nf = new Intl.NumberFormat("en-PH");

export const num = (n: number) => nf.format(Math.round(n));

export function liters(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M L`;
  return `${num(n)} L`;
}

export function peso(n: number): string {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₱${Math.round(n / 1_000)}k`;
  return `₱${num(n)}`;
}

export const days = (n: number) => `${n.toFixed(1)} ${n === 1 ? "day" : "days"}`;

export const STATUS: Record<Status, { color: string; label: string }> = {
  green: { color: "#15803d", label: "3+ days" },
  amber: { color: "#d97706", label: "1–3 days" },
  red: { color: "#dc2626", label: "Under 1 day" },
};

export const OUTCOME: Record<"holds" | "partial" | "fails", { status: Status; label: string }> = {
  holds: { status: "green", label: "Holds out" },
  partial: { status: "amber", label: "Partly" },
  fails: { status: "red", label: "Runs out" },
};

export const DECISION: Record<Decision, { label: string; className: string }> = {
  reuse: { label: "Reuse", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  treat_then_reuse: { label: "Treat, then reuse", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  discharge: { label: "Safe discharge", className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
};

export const SOURCE_LABEL: Record<string, string> = {
  rain: "Rain",
  light_greywater: "Light greywater",
  wash_water: "Wash water",
  condensate: "Aircon condensate",
  kitchen: "Kitchen water",
  toilet: "Toilet water",
};

export const CATEGORY_LABEL: Record<string, string> = {
  barangay_hall: "Barangay hall",
  school: "School",
  health_center: "Health center",
  laundromat: "Laundry shop",
  carwash: "Carwash",
  hotel: "Pension house",
};

export const DATA_STATUS_LABEL: Record<DataStatus, string> = {
  real: "Real",
  assumed: "Assumed",
  simulated: "Simulated",
};
