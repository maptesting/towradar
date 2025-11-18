// pages/history.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { classifyIncident, CATEGORY_LABEL, CATEGORY_BADGE_CLASS, CLAIM_BADGE_CLASS } from "../lib/utils";
import { useRouter } from "next/router";
import Nav from "../components/Nav";
import dynamic from "next/dynamic";

const MapPanel = dynamic(() => import("../components/MapPanel"), {
  ssr: false,
});

type ClaimStatus = "claimed" | "completed";

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
  distanceKm?: number;
  claim_status?: ClaimStatus | null;
  claim_note?: string | null;
};

type Company = {
  id?: string;
  base_lat: number;
  base_lng: number;
  radius_km: number;
};

type RangeKey = "24h" | "7d" | "30d";

type IncidentCategory = "crash" | "disabled" | "hazard" | "closure" | "other";

export default function HistoryPage() {
  const router = useRouter();

  // -------- Auth --------
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        router.replace("/auth");
        return;
      }
      setUserId(user.id);
      setAuthChecked(true);
    })();
  }, [router]);

  // -------- State --------
  const [company, setCompany] = useState<Company | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [range, setRange] = useState<RangeKey>("7d");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // -------- Load company --------
  useEffect(() => {
    if (!authChecked || !userId) return;

    (async () => {
      setErrorMsg(null);
      const { data, error } = await supabase
        .from("companies")
        .select("id, base_lat, base_lng, radius_km")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Company load error:", error);
        setErrorMsg("Error loading company profile.");
        return;
      }

      if (!data) {
        setCompany({
          base_lat: 35.227085,
          base_lng: -80.843124,
          radius_km: 40,
        });
        return;
      }

      setCompany(data as Company);
    })();
  }, [authChecked, userId]);

  // -------- Load history incidents + merge claims --------
  async function loadHistory(selectedRange?: RangeKey) {
    if (!company) return;

    const r = selectedRange ?? range;
    let days = 7;
    if (r === "24h") days = 1;
    if (r === "30d") days = 30;
    const minutes = days * 1440;

    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: { session } = {} } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/incidents-client?minutes=${minutes}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();

      if (!res.ok) {
        console.error(json);
        setErrorMsg(json.error || "Failed to load incidents.");
        setIncidents([]);
        return;
      }

      const baseIncidents = (json.incidents || []) as Incident[];

      if (company.id && baseIncidents.length > 0) {
        const ids = baseIncidents.map((i) => i.id);

        const { data: claims, error: claimsError } = await supabase
          .from("company_incident_claims")
          .select("incident_id, status, note")
          .eq("company_id", company.id)
          .in("incident_id", ids);

        if (claimsError) {
          console.error("Claims load error:", claimsError);
        }

        const map = new Map<
          string,
          { status: ClaimStatus; note: string | null }
        >();
        (claims || []).forEach((c: any) => {
          map.set(c.incident_id, {
            status: c.status as ClaimStatus,
            note: c.note ?? null,
          });
        });

        const merged = baseIncidents.map((inc) => {
          const c = map.get(inc.id);
          return {
            ...inc,
            claim_status: c?.status ?? null,
            claim_note: c?.note ?? null,
          };
        });

        setIncidents(merged);
      } else {
        setIncidents(baseIncidents);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Network error loading incidents.");
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!company) return;
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, range]);

  const center = company
    ? { lat: company.base_lat, lng: company.base_lng }
    : { lat: 35.227085, lng: -80.843124 };
  const radiusKm = company?.radius_km ?? 40;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Nav />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Incident History</h1>
              <p className="text-sm text-slate-400">
                Past incidents and which ones your company handled.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-2">
                Range:
                <select
                  value={range}
                  onChange={(e) =>
                    setRange(e.target.value as RangeKey)
                  }
                  className="rounded-md bg-slate-900 border border-slate-700 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </label>
              <button
                onClick={() => loadHistory()}
                className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </header>

          {errorMsg && (
            <p className="text-sm text-rose-400 border border-rose-500/40 bg-rose-950/40 rounded-md px-3 py-2">
              {errorMsg}
            </p>
          )}

          {!loading && !errorMsg && incidents.length === 0 && (
            <p className="text-sm text-slate-400">
              No incidents found for this range in your coverage area.
            </p>
          )}

          <section className="grid gap-4 md:grid-cols-[1.4fr,1.1fr] items-start">
            {/* List */}
            <div className="border border-slate-800 bg-slate-950/80 rounded-xl p-3 text-xs max-h-[480px] overflow-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 bg-slate-950">
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Details</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3 text-right">Dist (km)</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((inc) => {
                    const cat = classifyIncident(inc);
                    const claimStatus = inc.claim_status ?? null;

                    return (
                      <tr
                        key={inc.id}
                        className="border-b border-slate-900/60 hover:bg-slate-900/70"
                      >
                        <td className="py-1.5 pr-3 text-slate-300 whitespace-nowrap">
                          {new Date(inc.occurred_at).toLocaleString()}
                        </td>
                        <td className="py-1.5 pr-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_BADGE_CLASS[cat]}`}
                          >
                            {CATEGORY_LABEL[cat]}
                          </span>
                        </td>
                        <td className="py-1.5 pr-3 text-slate-300">
                          <div className="font-medium text-slate-100">
                            {inc.road && <span>{inc.road} • </span>}
                            {inc.city && <span>{inc.city}, </span>}
                            {inc.state && <span>{inc.state}</span>}
                          </div>
                          <div className="text-slate-400">
                            {inc.description || "No details"}
                          </div>
                        </td>
                        <td className="py-1.5 pr-3">
                          {claimStatus ? (
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${CLAIM_BADGE_CLASS[claimStatus]}`}
                            >
                              {claimStatus === "claimed"
                                ? "Claimed"
                                : "Completed"}
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                              Unclaimed
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 pr-3 text-right text-slate-300">
                          {inc.distanceKm?.toFixed(1) ?? "–"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Map */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Map overview</span>
                <span>{incidents.length} incident(s)</span>
              </div>
              <div className="border border-slate-800 bg-slate-950/80 rounded-xl p-2">
                <div className="h-[420px] w-full rounded-lg overflow-hidden">
                  {incidents.length > 0 && (
                    <MapPanel
                      incidents={incidents as any}
                      center={center}
                      radiusKm={radiusKm}
                    />
                  )}
                  {incidents.length === 0 && (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      No incidents to display
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
