// pages/api/ingest.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { fetchCharlotteIncidents } from "../../lib/incidentSources/ncCharlotte";
import { IncidentInput } from "../../lib/types";
import { apiRatelimit } from "../../lib/ratelimit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const { success } = await apiRatelimit.limit(String(ip));
    if (!success) {
      return res.status(429).json({ ok: false, error: "Rate limit exceeded" });
    }

    const authHeader = req.headers.authorization;
    if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const allIncidents: IncidentInput[] = [];
    const cltIncidents = await fetchCharlotteIncidents();
    console.log("NC TIMS Mecklenburg returned:", cltIncidents.length, "items");
    allIncidents.push(...cltIncidents);

    let inserted = 0;
    const errors: { externalId: string; message: string }[] = [];

    for (const inc of allIncidents) {
      const { error } = await supabase.from("incidents").upsert(
        {
          source: inc.source,
          external_id: inc.externalId,
          type: inc.type,
          description: inc.description,
          lat: inc.lat,
          lng: inc.lng,
          road: inc.road,
          city: inc.city,
          state: inc.state,
          occurred_at: inc.occurredAt.toISOString(),
        },
        { onConflict: "source,external_id" }
      );

      if (error) {
        console.error("Upsert error for", inc.externalId, error.message);
        errors.push({ externalId: inc.externalId, message: error.message });
      } else {
        inserted++;
      }
    }

    return res.status(errors.length ? 207 : 200).json({
      ok: errors.length === 0,
      fetched: allIncidents.length,
      inserted,
      errors,
    });
  } catch (err: any) {
    console.error("Ingest fatal error:", err);
    return res.status(500).json({
      ok: false,
      error: String(err?.message || err),
    });
  }
}
