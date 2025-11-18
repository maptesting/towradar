// components/MapPanel.tsx
import { useEffect, memo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { classifyIncident, CATEGORY_COLOR } from "../lib/utils";

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

function ResizeHandler() {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 0);
  }, [map]);

  return null;
}

function CoverageCircle({ center, radiusKm }: { center: { lat: number; lng: number }; radiusKm: number }) {
  const map = useMap();

  useEffect(() => {
    const circle = L.circle([center.lat, center.lng], {
      color: "#22c55e",
      fillOpacity: 0.05,
      radius: radiusKm * 1000,
    }).addTo(map);

    return () => {
      circle.remove();
    };
  }, [map, center, radiusKm]);

  return null;
}

const MapPanel = memo(function MapPanel({ incidents, center, radiusKm }: Props) {
  let zoom = 11;
  if (radiusKm <= 10) zoom = 13;
  else if (radiusKm <= 25) zoom = 12;
  else if (radiusKm >= 60) zoom = 10;

  const mapCenter: LatLngExpression = [center.lat, center.lng];

  return (
    <div>
      <MapContainer
        center={mapCenter as [number, number]}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <ResizeHandler />
        <CoverageCircle center={center} radiusKm={radiusKm} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Incidents: color-coded circle markers */}
        {incidents.map((inc) => {
          const cat = classifyIncident(inc);
          const color = CATEGORY_COLOR[cat];
          const incidentCenter: LatLngExpression = [inc.lat, inc.lng];

          return (
            <CircleMarker
              key={inc.id}
              center={incidentCenter}
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
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.center.lat === nextProps.center.lat &&
    prevProps.center.lng === nextProps.center.lng &&
    prevProps.radiusKm === nextProps.radiusKm &&
    prevProps.incidents.length === nextProps.incidents.length &&
    prevProps.incidents[0]?.id === nextProps.incidents[0]?.id
  );
});

export default MapPanel;
