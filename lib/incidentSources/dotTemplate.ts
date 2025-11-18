// lib/incidentSources/dotTemplate.ts
import { IncidentInput } from "../types";

export async function fetchDotIncidents(): Promise<IncidentInput[]> {
  // TODO: replace with a real 511/DOT endpoint that returns JSON or XML.
  // Example structure: [{ id, type, lat, lon, description, timestamp, road }]
  const resp = await fetch("https://example-dot-api.com/incidents.json");
  if (!resp.ok) {
    console.error("DOT feed failed", resp.status);
    return [];
  }

  const data = await resp.json();

  // Map raw data into your normalized shape
  const incidents: IncidentInput[] = data.items
    .filter((item: any) => {
      // filter to types we care about
      const t = (item.type || "").toLowerCase();
      return (
        t.includes("disabled") ||
        t.includes("accident") ||
        t.includes("crash")
      );
    })
    .map((item: any) => ({
      source: "dot_sample",
      externalId: String(item.id),
      type: item.eventType === "ACCIDENT" ? "accident" : "disabled_vehicle",
      description: item.description || "",
      lat: item.latitude,
      lng: item.longitude,
      road: item.roadName || null,
      city: item.city || null,
      state: item.state || null,
      occurredAt: new Date(item.timestamp),
    }));

  return incidents;
}
