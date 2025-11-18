// lib/utils.ts
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export type IncidentCategory = "crash" | "disabled" | "hazard" | "closure" | "other";

export function classifyIncident(i: { type?: string | null; description?: string | null }): IncidentCategory {
  const t = (i.type || "").toLowerCase();
  const d = (i.description || "").toLowerCase();

  if (t.includes("crash") || t.includes("accident")) return "crash";
  if (t.includes("disabled") || d.includes("disabled")) return "disabled";
  if (t.includes("hazard") || d.includes("hazard")) return "hazard";
  if (t.includes("closure") || t.includes("lane closed")) return "closure";
  return "other";
}

export const CATEGORY_LABEL: Record<IncidentCategory, string> = {
  crash: "Crash",
  disabled: "Disabled vehicle",
  hazard: "Hazard",
  closure: "Closure / lanes",
  other: "Other",
};

export const CATEGORY_BADGE_CLASS: Record<IncidentCategory, string> = {
  crash: "bg-rose-500/15 text-rose-300 border border-rose-500/40",
  disabled: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40",
  hazard: "bg-amber-500/15 text-amber-300 border border-amber-500/40",
  closure: "bg-sky-500/15 text-sky-300 border border-sky-500/40",
  other: "bg-violet-500/15 text-violet-300 border border-violet-500/40",
};

export const CLAIM_BADGE_CLASS = {
  claimed: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40",
  completed: "bg-slate-500/20 text-slate-300 border border-slate-500/40",
} as const;

export const CATEGORY_COLOR: Record<IncidentCategory, string> = {
  crash: "#f97373",
  disabled: "#22c55e",
  hazard: "#facc15",
  closure: "#38bdf8",
  other: "#a855f7",
};
