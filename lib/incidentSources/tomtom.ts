// lib/incidentSources/tomtom.ts
import { IncidentInput, IncidentType } from "../types";

function mapTomTomType(categoryCode: string): IncidentType {
  // TomTom incident category codes
  // 0 = Unknown, 1 = Accident, 2 = Fog, 3 = Dangerous Conditions, 
  // 4 = Rain, 5 = Ice, 6 = Jam, 7 = Lane Closed, 8 = Road Closed, 
  // 9 = Road Works, 10 = Wind, 11 = Flooding, 14 = Broken Down Vehicle
  
  const code = parseInt(categoryCode);
  
  if (code === 1) return "accident";
  if (code === 14) return "disabled_vehicle";
  return "hazard";
}

export async function fetchTomTomIncidents(): Promise<IncidentInput[]> {
  const apiKey = process.env.TOMTOM_API_KEY;
  
  if (!apiKey) {
    console.warn("TOMTOM_API_KEY not set, skipping TomTom source");
    return [];
  }

  // Charlotte bounding box (approximate)
  // Format: minLon,minLat,maxLon,maxLat
  const bbox = "-81.1,35.0,-80.6,35.4"; // Charlotte metro area
  
  const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${apiKey}&bbox=${bbox}&fields={incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,aci{probabilityOfOccurrence,numberOfReports,lastReportTime}}}}&language=en-US&categoryFilter=0,1,2,3,4,5,6,7,8,9,10,11,14&timeValidityFilter=present`;

  try {
    const resp = await fetch(url);
    
    if (!resp.ok) {
      console.error("TomTom API failed:", resp.status, resp.statusText);
      return [];
    }

    const data = await resp.json();
    
    if (!data.incidents || data.incidents.length === 0) {
      console.log("TomTom: No incidents in Charlotte area");
      return [];
    }

    console.log(`TomTom returned ${data.incidents.length} incidents`);

    const mapped: IncidentInput[] = data.incidents
      .map((item: any) => {
        try {
          // Get coordinates (TomTom uses GeoJSON format)
          let lat: number, lng: number;
          
          if (item.geometry?.type === "Point") {
            [lng, lat] = item.geometry.coordinates;
          } else if (item.geometry?.type === "LineString") {
            // Use first coordinate of the line
            [lng, lat] = item.geometry.coordinates[0];
          } else {
            return null;
          }

          if (!lat || !lng) return null;

          // Get incident details
          const props = item.properties || {};
          const events = props.events || [];
          const mainEvent = events[0] || {};
          
          const description = mainEvent.description || props.from || "Traffic incident";
          const incidentType = mapTomTomType(String(props.iconCategory || mainEvent.iconCategory || 0));
          
          const road = props.roadNumbers?.[0] || props.from || null;
          const externalId = String(props.id || `tomtom-${lat}-${lng}`);
          
          // Use startTime if available, otherwise use current time
          const occurredAt = props.startTime ? new Date(props.startTime) : new Date();

          return {
            source: "tomtom",
            externalId,
            type: incidentType,
            description,
            lat,
            lng,
            road,
            city: "Charlotte",
            state: "NC",
            occurredAt,
          } as IncidentInput;
        } catch (err) {
          console.error("Error parsing TomTom incident:", err);
          return null;
        }
      })
      .filter((x): x is IncidentInput => x !== null);

    return mapped;
  } catch (err: any) {
    console.error("Error fetching TomTom incidents:", err);
    return [];
  }
}
