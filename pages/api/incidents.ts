// pages/api/incidents.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// THIS CLIENT BYPASSES RLS (correct for backend jobs)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const minutes = Number(req.query.minutes) || 60;
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();

    // ❗ ALWAYS load the *first* company for now
    // (Later we pass company_id explicitly)
    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (companyErr) {
      console.error(companyErr);
      return res.status(500).json({ error: "Error loading company profile" });
    }

    if (!company) {
      return res.status(404).json({ error: "No company profile found" });
    }

    // Load recent incidents
    const { data: incidents, error: incErr } = await supabase
      .from("incidents")
      .select("*")
      .gte("occurred_at", cutoff);

    if (incErr) {
      console.error(incErr);
      return res.status(500).json({ error: "Error loading incidents" });
    }

    // Distance filter done server-side
    function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
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

    const filtered = (incidents || []).map((inc) => ({
      ...inc,
      distanceKm: haversineKm(
        company.base_lat,
        company.base_lng,
        inc.lat,
        inc.lng
      ),
    }))
    .filter((i) => i.distanceKm <= company.radius_km);

    return res.json({ incidents: filtered });
  } catch (err: any) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
