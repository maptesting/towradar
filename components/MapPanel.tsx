// components/MapPanel.tsx
import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Incident = {
  id: string;
  lat: number;
  lng: number;
  type: string;
  description?: string | null;
  road?: string | null;
  city?: string | null;
  state?: string | null;
  distanceKm?: number;
};

type Props = {
  incidents: Incident[];
  center: { lat: number; lng: number };
  radiusKm: number;
};

type IncidentCategory = "crash" | "disabled" | "hazard" | "closure" | "other";

function classifyIncident(i: Incident): IncidentCategory {
  const t = (i.type || "").toLowerCase();
  const d = (i.description || "").toLowerCase();

  if (t.includes("crash") || t.includes("accident")) return "crash";
  if (t.includes("disabled") || d.includes("disabled")) return "disabled";
  if (t.includes("hazard") || d.includes("hazard")) return "hazard";
  if (t.includes("closure") || t.includes("lane closed")) return "closure";
  return "other";
}

function categoryColor(cat: IncidentCategory): string {
  switch (cat) {
    case "crash":
      return "#f97373"; // red-ish
    case "disabled":
      return "#22c55e"; // green
    case "hazard":
      return "#facc15"; // yellow
    case "closure":
      return "#38bdf8"; // blue
    default:
      return "#a855f7"; // purple
  }
}

function ResizeHandler() {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 0);
  }, [map]);

  return null;
}

export default function MapPanel({ incidents, center, radiusKm }: Props) {
  let zoom = 11;
  if (radiusKm <= 10) zoom = 13;
  else if (radiusKm <= 25) zoom = 12;
  else if (radiusKm >= 60) zoom = 10;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom={false}
      className="h-full w-full"
      style={{ height: "100%", width: "100%" }}
    >
      <ResizeHandler />

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Coverage radius */}
      <Circle
        center={[center.lat, center.lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: "#22c55e", fillOpacity: 0.05 }}
      />

      {/* Incidents: color-coded circle markers */}
      {incidents.map((inc) => {
        const cat = classifyIncident(inc);
        const color = categoryColor(cat);

        return (
          <CircleMarker
            key={inc.id}
            center={[inc.lat, inc.lng]}
            radius={6}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.9 }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold mb-1">
                  {inc.type.replace("_", " ")}
                </div>
                {inc.description && (
                  <div className="mb-1">{inc.description}</div>
                )}
                <div className="text-slate-600">
                  {inc.road && <span>{inc.road} • </span>}
                  {inc.city && <span>{inc.city}, </span>}
                  {inc.state && <span>{inc.state}</span>}
                </div>
                {typeof inc.distanceKm === "number" && (
                  <div className="mt-1">
                    ~{inc.distanceKm.toFixed(1)} km from yard
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
