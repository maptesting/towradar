// pages/api/notify.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const cronSecret = process.env.CRON_SECRET;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ALERT_FROM_EMAIL = process.env.ALERT_FROM_EMAIL || "alerts@example.com";
const ALERT_TO_FALLBACK =
  process.env.ALERT_TO_FALLBACK || "you@example.com";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

type Company = {
  id: string;
  name: string;
  base_lat: number;
  base_lng: number;
  radius_km: number;
  alert_email: string | null;
  alert_phone: string | null;
};

type Incident = {
  id: string;
  type: string;
  description: string | null;
  lat: number;
  lng: number;
  road: string | null;
  city: string | null;
  state: string | null;
  occurred_at: string;
};

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

async function sendEmailAlert(
  to: string,
  company: Company,
  incidents: Incident[]
) {
  const subject = `[TowRadar] ${incidents.length} new incident${
    incidents.length > 1 ? "s" : ""
  } near your coverage area`;

  const lines = incidents.map((inc) => {
    const when = new Date(inc.occurred_at).toLocaleString();
    const where = `${inc.road || "Unknown road"} — ${inc.city || "Unknown"}, ${
      inc.state || ""
    }`;
    return `• ${inc.type.toUpperCase()} at ${where} (${when})`;
  });

  const text = [
    `Hi ${company.name},`,
    "",
    `TowRadar detected ${incidents.length} new incident${
      incidents.length > 1 ? "s" : ""
    } near your coverage area in the last 60 minutes:`,
    "",
    ...lines,
    "",
    "Log into your dashboard to see more details.",
  ].join("\n");

  if (!RESEND_API_KEY) {
    console.log("EMAIL ALERT (no provider configured):");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log(text);
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: ALERT_FROM_EMAIL,
      to: [to],
      subject,
      text,
    }),
  });
}

async function sendSmsAlert(
  phone: string,
  company: Company,
  incident: Incident
) {
  const body = `[TowRadar] ${incident.type.toUpperCase()} near ${
    incident.road || "unknown road"
  } in ${incident.city || "Charlotte"} — ~${new Date(
    incident.occurred_at
  ).toLocaleTimeString()}. Check dashboard for details.`;

  if (!twilioClient || !TWILIO_FROM_NUMBER) {
    console.log("SMS ALERT (no Twilio configured):");
    console.log("To:", phone);
    console.log("Body:", body);
    return;
  }

  await twilioClient.messages.create({
    from: TWILIO_FROM_NUMBER,
    to: phone,
    body,
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    // Get all companies
    const { data: companies, error: companyError } = await supabase
      .from("companies")
      .select("*");

    if (companyError) {
      console.error(companyError);
      return res
        .status(500)
        .json({ ok: false, error: "Failed to load companies" });
    }

    if (!companies || companies.length === 0) {
      return res.status(200).json({ ok: true, message: "No companies found" });
    }

    // Look back 60 minutes
    const cutoff = new Date(Date.now() - 60 * 60_000).toISOString();

    const { data: incidents, error: incError } = await supabase
      .from("incidents")
      .select("*")
      .gte("occurred_at", cutoff)
      .eq("state", "NC");

    if (incError) {
      console.error(incError);
      return res
        .status(500)
        .json({ ok: false, error: "Failed to load incidents" });
    }

    let totalNotified = 0;

    for (const company of companies as Company[]) {
      const relevant = (incidents as Incident[]).filter((inc) => {
        const d = haversineDistanceKm(
          company.base_lat,
          company.base_lng,
          inc.lat,
          inc.lng
        );
        return d <= company.radius_km;
      });

      if (relevant.length === 0) continue;

      // Exclude ones we've already notified on
      const { data: already, error: notifError } = await supabase
        .from("company_incident_notifications")
        .select("incident_id")
        .eq("company_id", company.id);

      if (notifError) {
        console.error(notifError);
        continue;
      }

      const alreadyIds = new Set((already || []).map((r: any) => r.incident_id));
      const newOnes = relevant.filter((inc) => !alreadyIds.has(inc.id));

      if (newOnes.length === 0) continue;

      const toEmail =
        company.alert_email || ALERT_TO_FALLBACK || "you@example.com";

      // Email summary for all new incidents
      await sendEmailAlert(toEmail, company, newOnes);

      // SMS: send one message per incident to the company phone
      if (company.alert_phone) {
        for (const inc of newOnes) {
          await sendSmsAlert(company.alert_phone, company, inc);
        }
      }

      // Record notifications
      const rows = newOnes.map((inc) => ({
        company_id: company.id,
        incident_id: inc.id,
        channel: "email_sms" as const,
      }));

      const { error: insertError } = await supabase
        .from("company_incident_notifications")
        .insert(rows);

      if (insertError) {
        console.error("Failed to save notifications", insertError);
      } else {
        totalNotified += newOnes.length;
      }
    }

    return res.status(200).json({
      ok: true,
      notified: totalNotified,
    });
  } catch (err: any) {
    console.error("notify API error:", err);
    return res
      .status(500)
      .json({ ok: false, error: String(err?.message || err) });
  }
}
