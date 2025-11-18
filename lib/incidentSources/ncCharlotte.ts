// lib/incidentSources/ncCharlotte.ts
import { IncidentInput, IncidentType } from "../types";

function mapNcType(raw: string | null | undefined): IncidentType {
  const s = (raw || "").toLowerCase();

  if (s.includes("crash") || s.includes("accident") || s.includes("collision")) {
    return "accident";
  }
  if (s.includes("disabled") || s.includes("stall")) {
    return "disabled_vehicle";
  }
  return "hazard";
}

export async function fetchCharlotteIncidents(): Promise<IncidentInput[]> {
  const url =
    "https://eapps.ncdot.gov/services/traffic-prod/v1/counties/60/incidents?recent=true&verbose=true";

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error("Charlotte (Mecklenburg) feed failed:", resp.status, resp.statusText);
      return [];
    }

    const data = await resp.json();

    // Try to normalize whatever shape we get back
    let items: any[] = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (Array.isArray((data as any).incidents)) {
      items = (data as any).incidents;
    } else if (Array.isArray((data as any).items)) {
      items = (data as any).items;
    } else {
      console.warn("Unexpected NC TIMS response shape:", Object.keys(data));
      return [];
    }

    if (items.length > 0) {
      console.log("Sample NC TIMS item:", items[0]);
    }

    const mapped: IncidentInput[] = items
      .map((item: any) => {
        const incidentType = mapNcType(item.incidentType || item.eventType);

        const lat = Number(item.latitude ?? item.lat);
        const lng = Number(item.longitude ?? item.lon ?? item.long);

        if (Number.isNaN(lat) || Number.isNaN(lng)) {
          return null;
        }

        const description =
          item.eventDescription ||
          item.description ||
          item.impactingRoadway ||
          "";

        const road =
          item.roadName ||
          item.routeId ||
          item.routeName ||
          item.roadwayName ||
          null;

        const city = item.city || "Charlotte";
        const state = "NC";

        const occurredAtRaw =
          item.startTime ||
          item.createDateTime ||
          item.lastUpdated ||
          item.timestamp;

        const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();

        const externalId = String(
          item.id ?? item.eventId ?? item.incidentId ?? `${lat},${lng},${occurredAt.getTime()}`
        );

        return {
          source: "nc_mecklenburg",
          externalId,
          type: incidentType,
          description,
          lat,
          lng,
          road,
          city,
          state,
          occurredAt,
        } as IncidentInput;
      })
      .filter((x): x is IncidentInput => x !== null);

    return mapped;
  } catch (err: any) {
    console.error("Error fetching NC TIMS:", err);
    return [];
  }
}
