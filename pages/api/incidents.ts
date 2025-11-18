// pages/api/incidents.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { haversineDistanceKm } from "../../lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const cronSecret = process.env.CRON_SECRET;

// THIS CLIENT BYPASSES RLS (correct for backend jobs)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const minutesSchema = z.preprocess((v) => Number(v), z.number().int().min(1).max(60 * 24).optional());
    const parsedMinutes = minutesSchema.parse(req.query.minutes);
    const minutes = parsedMinutes ?? 60;
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

    const filtered = (incidents || [])
      .map((inc) => ({
        ...inc,
        distanceKm: haversineDistanceKm(
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
