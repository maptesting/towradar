export type IncidentType = "accident" | "disabled_vehicle" | "hazard";

export type IncidentInput = {
  source: string;
  externalId: string;
  type: IncidentType;
  description?: string;
  lat: number;
  lng: number;
  road?: string | null;
  city?: string | null;
  state?: string | null;
  occurredAt: Date;
};