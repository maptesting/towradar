// pages/driver-dashboard.tsx
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Nav from "../components/Nav";
import { supabase } from "../lib/supabaseClient";
import { classifyIncident, CATEGORY_LABEL, CATEGORY_BADGE_CLASS } from "../lib/utils";

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
  claimed_at?: string;
  truck_name?: string | null;
};

type Truck = {
  id: string;
  name: string;
  status: string;
};

type AvailableIncident = Incident & {
  distanceKm?: number;
  claim_status?: string | null;
};

export default function DriverDashboard() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [myIncidents, setMyIncidents] = useState<Incident[]>([]);
  const [availableIncidents, setAvailableIncidents] = useState<AvailableIncident[]>([]);
  const [myTruck, setMyTruck] = useState<Truck | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  
  const MAX_ACTIVE_JOBS = 2; // Driver can only have 2 active jobs at once

  // Auth check
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

  // Load company
  useEffect(() => {
    if (!authChecked || !userId) return;

    (async () => {
      // Get company from company_users table
      const { data: userData, error: userError } = await supabase
        .from("company_users")
        .select("company_id, role")
        .eq("user_id", userId)
        .maybeSingle();

      if (userError) {
        console.error("User role error:", userError);
        setErrorMsg("Error loading your profile.");
        return;
      }

      if (!userData) {
        setErrorMsg("You are not part of any company team yet.");
        return;
      }

      // If they're an owner, redirect to main dashboard
      if (userData.role === "owner") {
        router.replace("/dashboard");
        return;
      }

      setCompanyId(userData.company_id);
    })();
  }, [authChecked, userId, router]);

  // Load driver's incidents and truck
  useEffect(() => {
    if (!companyId || !userId) return;
    loadDriverData();
  }, [companyId, userId]);

  async function loadDriverData() {
    if (!companyId || !userId) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // Get incidents assigned to this driver
      const { data: claims, error: claimsError } = await supabase
        .from("company_incident_claims")
        .select(`
          incident_id,
          truck_id,
          claimed_at,
          status,
          trucks (
            name
          )
        `)
        .eq("company_id", companyId)
        .eq("driver_user_id", userId)
        .eq("status", "claimed");

      if (claimsError) {
        console.error("Claims error:", claimsError);
        setErrorMsg("Error loading your jobs.");
        setLoading(false);
        return;
      }

      if (!claims || claims.length === 0) {
        setMyIncidents([]);
        setLoading(false);
        return;
      }

      // Get incident details
      const incidentIds = claims.map((c: any) => c.incident_id);
      const { data: incidents, error: incError } = await supabase
        .from("incidents")
        .select("*")
        .in("id", incidentIds);

      if (incError) {
        console.error("Incidents error:", incError);
        setErrorMsg("Error loading incident details.");
        setLoading(false);
        return;
      }

      // Merge claims data with incidents
      const claimsMap = new Map();
      claims.forEach((c: any) => {
        claimsMap.set(c.incident_id, {
          claimed_at: c.claimed_at,
          truck_name: c.trucks?.name || null,
        });
      });

      const merged = (incidents || []).map((inc: any) => ({
        ...inc,
        claimed_at: claimsMap.get(inc.id)?.claimed_at,
        truck_name: claimsMap.get(inc.id)?.truck_name,
      }));

      setMyIncidents(merged);

      // Get driver's assigned truck (most recent)
      if (claims.length > 0 && (claims[0] as any).truck_id) {
        const { data: truckData } = await supabase
          .from("trucks")
          .select("id, name, status")
          .eq("id", (claims[0] as any).truck_id)
          .single();

        if (truckData) {
          setMyTruck(truckData);
        }
      }
    } catch (err) {
      console.error("Load error:", err);
      setErrorMsg("Error loading your data.");
    }

    setLoading(false);
  }

  // Load available incidents nearby
  async function loadAvailableIncidents() {
    if (!companyId) return;

    try {
      const { data: { session } = {} } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Get incidents from last hour
      const res = await fetch(`/api/incidents-client?minutes=60`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();

      if (!res.ok) {
        console.error("Available incidents error:", json);
        return;
      }

      const baseIncidents = (json.incidents || []) as AvailableIncident[];

      // Get all claims for this company to filter out already claimed
      const { data: claims } = await supabase
        .from("company_incident_claims")
        .select("incident_id, status")
        .eq("company_id", companyId);

      const claimedIds = new Set((claims || []).map((c: any) => c.incident_id));

      // Filter to unclaimed incidents only
      const available = baseIncidents.filter((inc) => !claimedIds.has(inc.id));

      setAvailableIncidents(available);
    } catch (err) {
      console.error("Load available error:", err);
    }
  }

  useEffect(() => {
    if (!companyId) return;
    loadAvailableIncidents();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadAvailableIncidents, 30000);
    return () => clearInterval(interval);
  }, [companyId]);

  async function handleSelfClaim(incident: AvailableIncident) {
    if (!companyId || !userId) return;

    // Check if driver already has max jobs
    if (myIncidents.length >= MAX_ACTIVE_JOBS) {
      setErrorMsg(`You can only have ${MAX_ACTIVE_JOBS} active jobs at a time. Complete a job first.`);
      return;
    }

    // Get available truck assigned to this driver or any available truck
    const { data: trucksData } = await supabase
      .from("trucks")
      .select("id, name")
      .eq("company_id", companyId)
      .eq("status", "available")
      .limit(1);

    if (!trucksData || trucksData.length === 0) {
      setErrorMsg("No available trucks. Contact your dispatcher.");
      return;
    }

    const truck = trucksData[0];
    setClaimingId(incident.id);

    // Create claim
    const { error: claimError } = await supabase
      .from("company_incident_claims")
      .insert({
        company_id: companyId,
        incident_id: incident.id,
        status: "claimed",
        truck_id: truck.id,
        driver_user_id: userId,
        claimed_at: new Date().toISOString(),
      });

    if (claimError) {
      console.error("Self-claim error:", claimError);
      setErrorMsg("Error claiming incident. It may have been claimed by someone else.");
      setClaimingId(null);
      return;
    }

    // Update truck status
    await supabase
      .from("trucks")
      .update({ status: "on_job", updated_at: new Date().toISOString() })
      .eq("id", truck.id);

    // Reload data
    await loadDriverData();
    await loadAvailableIncidents();
    setClaimingId(null);
    setErrorMsg(null);
  }

  async function handleComplete(incidentId: string) {
    if (!companyId || !userId) return;

    // Get the truck_id from the claim
    const { data: claimData } = await supabase
      .from("company_incident_claims")
      .select("truck_id")
      .eq("company_id", companyId)
      .eq("incident_id", incidentId)
      .eq("driver_user_id", userId)
      .single();

    const { error } = await supabase
      .from("company_incident_claims")
      .update({ 
        status: "completed",
        completed_at: new Date().toISOString()
      })
      .eq("company_id", companyId)
      .eq("incident_id", incidentId)
      .eq("driver_user_id", userId);

    if (error) {
      console.error("Complete error:", error);
      setErrorMsg("Error marking job complete.");
    } else {
      // Set truck back to available
      if (claimData?.truck_id) {
        await supabase
          .from("trucks")
          .update({ status: "available", updated_at: new Date().toISOString() })
          .eq("id", claimData.truck_id);
      }

      loadDriverData();
      loadAvailableIncidents();
    }
  }

  const stats = useMemo(() => {
    return {
      activeJobs: myIncidents.length,
      crashes: myIncidents.filter((i) => classifyIncident(i) === "crash").length,
      disabled: myIncidents.filter((i) => classifyIncident(i) === "disabled").length,
    };
  }, [myIncidents]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Nav />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
          <header>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-semibold">Driver Dashboard</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/40">
                Driver Mode
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Your assigned jobs and truck status
            </p>
          </header>

          {errorMsg && (
            <p className="text-sm text-rose-400 border border-rose-500/40 bg-rose-950/40 rounded-md px-3 py-2">
              {errorMsg}
            </p>
          )}

          {/* Stats Cards */}
          <section className="grid gap-3 md:grid-cols-3 text-xs">
            <div className="border border-slate-800 bg-slate-950/80 rounded-xl p-4">
              <p className="text-slate-400 mb-1">Active Jobs</p>
              <p className="text-3xl font-semibold text-emerald-400">
                {stats.activeJobs}
              </p>
            </div>
            <div className="border border-slate-800 bg-slate-950/80 rounded-xl p-4">
              <p className="text-slate-400 mb-1">Crash Calls</p>
              <p className="text-3xl font-semibold text-slate-100">
                {stats.crashes}
              </p>
            </div>
            <div className="border border-slate-800 bg-slate-950/80 rounded-xl p-4">
              <p className="text-slate-400 mb-1">Disabled Vehicles</p>
              <p className="text-3xl font-semibold text-slate-100">
                {stats.disabled}
              </p>
            </div>
          </section>

          {/* Truck Status */}
          {myTruck && (
            <section className="border border-slate-800 bg-slate-950/80 rounded-xl p-4">
              <h2 className="text-sm font-semibold mb-3">Your Truck</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-medium text-slate-100">
                    {myTruck.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Status: {myTruck.status.replace(/_/g, " ")}
                  </p>
                </div>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                    myTruck.status === "on_job"
                      ? "bg-blue-500/10 text-blue-300 border border-blue-500/40"
                      : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                  }`}
                >
                  {myTruck.status === "on_job" ? "On Job" : "Available"}
                </span>
              </div>
            </section>
          )}

          {/* Active Jobs */}
          <section className="border border-slate-800 bg-slate-950/80 rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-4">Your Active Jobs</h2>

            {loading && (
              <p className="text-sm text-slate-400">Loading jobs...</p>
            )}

            {!loading && myIncidents.length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-2">No active jobs assigned</p>
                <p className="text-xs text-slate-500">
                  When your dispatcher assigns you a job, it will show here.
                </p>
              </div>
            )}

            {!loading && myIncidents.length > 0 && (
              <div className="space-y-3">
                {myIncidents.map((inc) => {
                  const cat = classifyIncident(inc);

                  return (
                    <div
                      key={inc.id}
                      className="border border-slate-700 bg-slate-900/40 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_BADGE_CLASS[cat]}`}
                          >
                            {CATEGORY_LABEL[cat]}
                          </span>
                          {inc.truck_name && (
                            <span className="ml-2 text-xs text-slate-400">
                              🚛 {inc.truck_name}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleComplete(inc.id)}
                          className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                        >
                          Mark Complete
                        </button>
                      </div>

                      <div className="space-y-1">
                        <p className="font-medium text-slate-100">
                          {inc.road || "Unknown location"}
                        </p>
                        <p className="text-sm text-slate-300">
                          {inc.city && <span>{inc.city}, </span>}
                          {inc.state}
                        </p>
                        <p className="text-xs text-slate-400">
                          {inc.description || "No details available"}
                        </p>
                        <div className="flex gap-4 text-xs text-slate-500 mt-2">
                          <span>
                            Occurred:{" "}
                            {new Date(inc.occurred_at).toLocaleString()}
                          </span>
                          {inc.claimed_at && (
                            <span>
                              Claimed:{" "}
                              {new Date(inc.claimed_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${inc.lat},${inc.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          Open in Google Maps
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Available Incidents - Driver Can Self-Claim */}
          <section className="border border-emerald-800 bg-emerald-950/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold">Available Incidents Nearby</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Claim jobs yourself (max {MAX_ACTIVE_JOBS} active at once)
                </p>
              </div>
              <button
                onClick={loadAvailableIncidents}
                className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs"
              >
                Refresh
              </button>
            </div>

            {myIncidents.length >= MAX_ACTIVE_JOBS && (
              <div className="text-center py-4 border border-yellow-500/40 bg-yellow-950/20 rounded-md mb-4">
                <p className="text-sm text-yellow-300">
                  You have {MAX_ACTIVE_JOBS} active jobs. Complete one before claiming more.
                </p>
              </div>
            )}

            {availableIncidents.length === 0 && (
              <div className="text-center py-6">
                <p className="text-slate-400 text-sm">No unclaimed incidents nearby</p>
                <p className="text-xs text-slate-500 mt-1">
                  New incidents will appear here automatically
                </p>
              </div>
            )}

            {availableIncidents.length > 0 && (
              <div className="space-y-2">
                {availableIncidents.slice(0, 10).map((inc) => {
                  const cat = classifyIncident(inc);
                  const canClaim = myIncidents.length < MAX_ACTIVE_JOBS;

                  return (
                    <div
                      key={inc.id}
                      className="border border-slate-700 bg-slate-900/40 rounded-lg p-3 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_BADGE_CLASS[cat]}`}
                          >
                            {CATEGORY_LABEL[cat]}
                          </span>
                          {inc.distanceKm && (
                            <span className="text-xs text-slate-500">
                              {inc.distanceKm.toFixed(1)} km away
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-100">
                          {inc.road || "Unknown location"}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {inc.description || "No details"}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {new Date(inc.occurred_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleSelfClaim(inc)}
                        disabled={!canClaim || claimingId === inc.id}
                        className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {claimingId === inc.id ? "Claiming..." : "Claim"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
