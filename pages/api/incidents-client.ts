// pages/api/incidents-client.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { haversineDistanceKm } from "../../lib/utils";
import { incidentsRatelimit } from "../../lib/ratelimit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase server env vars");
}

// Client for data queries (with service role)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const minutesSchema = z.preprocess((v) => Number(v), z.number().int().min(1).max(60 * 24).optional());

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const { success } = await incidentsRatelimit.limit(String(ip));
    if (!success) {
      return res.status(429).json({ ok: false, error: "Rate limit exceeded" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ ok: false, error: "Missing authorization" });

    const token = authHeader.replace(/^Bearer\s+/i, "");

    // Verify token using Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError) {
      console.error("Auth validation error:", authError.message, authError);
      return res.status(401).json({ 
        ok: false, 
        error: "Invalid session", 
        details: process.env.NODE_ENV === "development" ? authError.message : undefined 
      });
    }

    if (!user) {
      console.error("No user found for token");
      return res.status(401).json({ ok: false, error: "Invalid session - no user" });
    }

    const parsed = minutesSchema.parse(req.query.minutes);
    const minutes = parsed ?? 60;
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();

    // Load company for this user (one-per-user for now)
    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (companyErr) {
      console.error(companyErr);
      return res.status(500).json({ ok: false, error: "Error loading company profile" });
    }

    if (!company) {
      return res.status(404).json({ ok: false, error: "No company profile found" });
    }

    const { data: incidents, error: incErr } = await supabase
      .from("incidents")
      .select("*")
      .gte("occurred_at", cutoff);

    if (incErr) {
      console.error(incErr);
      return res.status(500).json({ ok: false, error: "Error loading incidents" });
    }

    const filtered = (incidents || [])
      .map((inc: any) => ({
        id: inc.id,
        type: inc.type,
        description: inc.description ?? null,
        lat: inc.lat,
        lng: inc.lng,
        road: inc.road ?? null,
        city: inc.city ?? null,
        state: inc.state ?? null,
        occurred_at: inc.occurred_at,
        distanceKm: haversineDistanceKm(company.base_lat, company.base_lng, inc.lat, inc.lng),
      }))
      .filter((i: any) => i.distanceKm <= company.radius_km);

    return res.status(200).json({ ok: true, incidents: filtered });
  } catch (err: any) {
    console.error("incidents-client error:", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
