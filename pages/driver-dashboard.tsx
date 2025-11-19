// pages/driver-dashboard.tsx
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import Nav from "../components/Nav";
import { supabase } from "../lib/supabaseClient";
import { classifyIncident, CATEGORY_LABEL, CATEGORY_BADGE_CLASS } from "../lib/utils";
import { requestNotificationPermission, notifyJobAssigned, notifyNearbyIncident } from "../lib/notifications";

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
  status?: "claimed" | "en_route" | "on_scene" | "completed";
  claimed_at?: string;
  en_route_at?: string;
  on_scene_at?: string;
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

// Helper function to format elapsed time
function formatElapsedTime(startDate: string): string {
  const start = new Date(startDate).getTime();
  const now = Date.now();
  const diffMs = now - start;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m ago`;
}

export default function DriverDashboard() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [myIncidents, setMyIncidents] = useState<Incident[]>([]);
  const myIncidentsRef = useRef<Incident[]>([]);
  const [availableIncidents, setAvailableIncidents] = useState<AvailableIncident[]>([]);
  const availableIncidentsRef = useRef<AvailableIncident[]>([]);
  const [myTruck, setMyTruck] = useState<Truck | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  
  const MAX_ACTIVE_JOBS = 2; // Driver can only have 2 active jobs at once

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

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
          en_route_at,
          on_scene_at,
          status,
          trucks (
            name
          )
        `)
        .eq("company_id", companyId)
        .eq("driver_user_id", userId)
        .in("status", ["claimed", "en_route", "on_scene"]);

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
          status: c.status,
          claimed_at: c.claimed_at,
          en_route_at: c.en_route_at,
          on_scene_at: c.on_scene_at,
          truck_name: c.trucks?.name || null,
        });
      });

      const merged = (incidents || []).map((inc: any) => ({
        ...inc,
        status: claimsMap.get(inc.id)?.status,
        claimed_at: claimsMap.get(inc.id)?.claimed_at,
        en_route_at: claimsMap.get(inc.id)?.en_route_at,
        on_scene_at: claimsMap.get(inc.id)?.on_scene_at,
        truck_name: claimsMap.get(inc.id)?.truck_name,
      }));

      // Detect new job assignments
      const prevIds = new Set(myIncidentsRef.current.map(i => i.id));
      const newJobs = merged.filter((inc: Incident) => !prevIds.has(inc.id));
      
      if (newJobs.length > 0) {
        newJobs.forEach((job: Incident) => {
          notifyJobAssigned({
            id: job.id,
            description: job.description || "No description",
            road: job.road,
            truckName: job.truck_name || undefined,
          });
        });
      }

      setMyIncidents(merged);
      myIncidentsRef.current = merged;

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

      // Detect new nearby incidents (within 5km)
      const prevIds = new Set(availableIncidentsRef.current.map(i => i.id));
      const newNearby = available.filter((inc) => 
        !prevIds.has(inc.id) && 
        inc.distanceKm !== undefined && 
        inc.distanceKm <= 5
      );
      
      if (newNearby.length > 0) {
        // Only notify about the closest one to avoid spam
        const closest = newNearby.sort((a, b) => 
          (a.distanceKm || 999) - (b.distanceKm || 999)
        )[0];
        
        notifyNearbyIncident({
          id: closest.id,
          type: closest.type,
          road: closest.road,
          distanceKm: closest.distanceKm,
        });
      }

      setAvailableIncidents(available);
      availableIncidentsRef.current = available;
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

  async function updateJobStatus(
    incidentId: string,
    newStatus: "claimed" | "en_route" | "on_scene" | "completed"
  ) {
    if (!companyId || !userId) return;

    const updateData: any = { status: newStatus };

    // Add timestamp for each status
    if (newStatus === "en_route") {
      updateData.en_route_at = new Date().toISOString();
    } else if (newStatus === "on_scene") {
      updateData.on_scene_at = new Date().toISOString();
    } else if (newStatus === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("company_incident_claims")
      .update(updateData)
      .eq("company_id", companyId)
      .eq("incident_id", incidentId)
      .eq("driver_user_id", userId);

    if (error) {
      console.error("Status update error:", error);
      setErrorMsg(`Error updating status to ${newStatus}.`);
      return;
    }

    // If completed, free up the truck
    if (newStatus === "completed") {
      const { data: claimData } = await supabase
        .from("company_incident_claims")
        .select("truck_id")
        .eq("company_id", companyId)
        .eq("incident_id", incidentId)
        .eq("driver_user_id", userId)
        .single();

      if (claimData?.truck_id) {
        await supabase
          .from("trucks")
          .update({ status: "available", updated_at: new Date().toISOString() })
          .eq("id", claimData.truck_id);
      }

      loadAvailableIncidents();
    }

    loadDriverData();
    setErrorMsg(null);
  }

  async function handleComplete(incidentId: string) {
    await updateJobStatus(incidentId, "completed");
  }

  const stats = useMemo(() => {
    return {
      activeJobs: myIncidents.length,
      crashes: myIncidents.filter((i) => classifyIncident(i) === "crash").length,
      disabled: myIncidents.filter((i) => classifyIncident(i) === "disabled").length,
    };
  }, [myIncidents]);

  return (
    <div className="min-h-screen text-slate-50 flex flex-col">
      <Nav />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
          <header>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent">Driver Dashboard</h1>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold glass shadow-glow">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-blue-300">Driver Mode</span>
              </span>
            </div>
            <p className="text-base text-slate-400">
              Your assigned jobs and truck status
            </p>
          </header>

          {errorMsg && (
            <p className="text-sm text-rose-400 border border-rose-500/40 bg-rose-950/40 rounded-md px-3 py-2">
              {errorMsg}
            </p>
          )}

          {/* Stats Cards */}
          <section className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="glass rounded-2xl p-5 border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
              <p className="text-slate-400 mb-2">Active Jobs</p>
              <p className="text-4xl font-bold text-blue-400">
                {stats.activeJobs}
              </p>
            </div>
            <div className="glass rounded-2xl p-5 border border-rose-500/30 bg-gradient-to-br from-rose-500/5 to-transparent">
              <p className="text-slate-400 mb-2">Crash Calls</p>
              <p className="text-4xl font-bold text-rose-400">
                {stats.crashes}
              </p>
            </div>
            <div className="glass rounded-2xl p-5 border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
              <p className="text-slate-400 mb-2">Disabled Vehicles</p>
              <p className="text-4xl font-bold text-amber-400">
                {stats.disabled}
              </p>
            </div>
          </section>

          {/* Truck Status */}
          {myTruck && (
            <section className="glass-strong rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-base font-semibold mb-4 text-slate-300">Your Truck</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-slate-100">
                    {myTruck.name}
                  </p>
                  <p className="text-sm text-slate-400 mt-2">
                    Status: {myTruck.status.replace(/_/g, " ")}
                  </p>
                </div>
                <span
                  className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${
                    myTruck.status === "on_job"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-glow"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-glow"
                  }`}
                >
                  {myTruck.status === "on_job" ? "On Job" : "Available"}
                </span>
              </div>
            </section>
          )}

          {/* Active Jobs */}
          <section className="glass-strong rounded-2xl p-6 border border-slate-700/50">
            <h2 className="text-lg font-bold mb-6 text-slate-200">Your Active Jobs</h2>

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
              <div className="space-y-4">
                {myIncidents.map((inc) => {
                  const cat = classifyIncident(inc);

                  return (
                    <div
                      key={inc.id}
                      className="glass rounded-xl p-5 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex gap-2 items-center flex-wrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_BADGE_CLASS[cat]}`}
                          >
                            {CATEGORY_LABEL[cat]}
                          </span>
                          {inc.truck_name && (
                            <span className="text-xs text-slate-400">
                              🚛 {inc.truck_name}
                            </span>
                          )}
                          {/* Status Badge */}
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            inc.status === "claimed" ? "bg-yellow-900/40 text-yellow-400 border border-yellow-700" :
                            inc.status === "en_route" ? "bg-blue-900/40 text-blue-400 border border-blue-700" :
                            inc.status === "on_scene" ? "bg-purple-900/40 text-purple-400 border border-purple-700" :
                            "bg-slate-900/40 text-slate-400 border border-slate-700"
                          }`}>
                            {inc.status === "claimed" ? "📋 Claimed" :
                             inc.status === "en_route" ? "🚗 En Route" :
                             inc.status === "on_scene" ? "🔧 On Scene" :
                             "Claimed"}
                          </span>
                        </div>
                      </div>
                      
                      {/* Status Action Buttons */}
                      <div className="flex gap-3 mb-4">
                        {inc.status === "claimed" && (
                          <button
                            onClick={() => updateJobStatus(inc.id, "en_route")}
                            className="px-4 py-2 rounded-lg gradient-blue text-white text-sm font-semibold shadow-glow hover:scale-105 transition-transform"
                          >
                            🚗 Mark En Route
                          </button>
                        )}
                        {inc.status === "en_route" && (
                          <button
                            onClick={() => updateJobStatus(inc.id, "on_scene")}
                            className="px-4 py-2 rounded-lg gradient-purple text-white text-sm font-semibold shadow-glow hover:scale-105 transition-transform"
                          >
                            🔧 Mark On Scene
                          </button>
                        )}
                        {inc.status === "on_scene" && (
                          <button
                            onClick={() => updateJobStatus(inc.id, "completed")}
                            className="px-4 py-2 rounded-lg gradient-emerald text-white text-sm font-semibold shadow-glow hover:scale-105 transition-transform"
                          >
                            ✅ Complete Job
                          </button>
                        )}
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
                        
                        {/* Status Timestamps */}
                        <div className="flex flex-wrap gap-3 text-xs mt-2">
                          <span className="text-slate-500">
                            Occurred: {formatElapsedTime(inc.occurred_at)}
                          </span>
                          {inc.claimed_at && (
                            <span className="text-slate-400">
                              Claimed: {formatElapsedTime(inc.claimed_at)}
                            </span>
                          )}
                          {inc.en_route_at && (
                            <span className="text-blue-400 font-medium">
                              🚗 En Route: {formatElapsedTime(inc.en_route_at)}
                            </span>
                          )}
                          {inc.on_scene_at && (
                            <span className="text-purple-400 font-medium">
                              🔧 On Scene: {formatElapsedTime(inc.on_scene_at)}
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
          <section className="glass-strong rounded-2xl p-6 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-emerald-300">Available Incidents Nearby</h2>
                <p className="text-sm text-slate-400 mt-2">
                  Claim jobs yourself (max {MAX_ACTIVE_JOBS} active at once)
                </p>
              </div>
              <button
                onClick={loadAvailableIncidents}
                className="px-4 py-2 rounded-lg glass border border-slate-700/50 hover:bg-white/5 text-slate-100 text-sm font-medium transition-colors"
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
              <div className="space-y-3">
                {availableIncidents.slice(0, 10).map((inc) => {
                  const cat = classifyIncident(inc);
                  const canClaim = myIncidents.length < MAX_ACTIVE_JOBS;

                  return (
                    <div
                      key={inc.id}
                      className="glass rounded-xl p-4 border border-slate-700/50 hover:border-emerald-500/30 transition-colors flex items-start justify-between gap-4"
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
                        className="px-5 py-2 rounded-lg gradient-emerald text-white text-sm font-semibold shadow-glow hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap"
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
