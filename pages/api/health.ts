// pages/api/health.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const checks: any = {
    timestamp: new Date().toISOString(),
    status: "ok",
    checks: {},
  };

  // Check environment variables
  checks.checks.env = {
    supabaseUrl: !!supabaseUrl,
    supabaseKey: !!supabaseServiceKey,
    cronSecret: !!process.env.CRON_SECRET,
    redisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
  };

  // Check database connection
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Try to query incidents table
      const { data, error } = await supabase
        .from("incidents")
        .select("id")
        .limit(1);

      checks.checks.database = {
        connected: !error,
        error: error?.message || null,
      };

      // Get recent incident count (last 24 hours)
      if (!error) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("incidents")
          .select("*", { count: "exact", head: true })
          .gte("occurred_at", oneDayAgo);

        checks.checks.incidentsLast24h = count || 0;
      }

      // Check for recent updates (indicates ingest is working)
      const { data: recentIncident } = await supabase
        .from("incidents")
        .select("occurred_at, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (recentIncident) {
        checks.checks.lastIncidentIngested = recentIncident.created_at;
        const minutesAgo = Math.floor(
          (Date.now() - new Date(recentIncident.created_at).getTime()) / 60000
        );
        checks.checks.minutesSinceLastIngest = minutesAgo;
        
        // Warn if no incidents in last 30 minutes (might indicate ingest issues)
        if (minutesAgo > 30) {
          checks.checks.warning = `No incidents ingested in ${minutesAgo} minutes`;
          checks.status = "warning";
        }
      }

      // Check companies
      const { count: companyCount } = await supabase
        .from("companies")
        .select("*", { count: "exact", head: true });

      checks.checks.companies = companyCount || 0;

    } catch (err: any) {
      checks.checks.database = {
        connected: false,
        error: err.message,
      };
      checks.status = "error";
    }
  } else {
    checks.checks.database = {
      connected: false,
      error: "Missing Supabase configuration",
    };
    checks.status = "error";
  }

  const statusCode = checks.status === "ok" ? 200 : checks.status === "warning" ? 200 : 503;
  res.status(statusCode).json(checks);
}
