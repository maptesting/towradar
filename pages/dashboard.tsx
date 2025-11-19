// pages/dashboard.tsx
import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Nav from "../components/Nav";
import { supabase } from "../lib/supabaseClient";
import { classifyIncident, CATEGORY_LABEL, CATEGORY_BADGE_CLASS, CLAIM_BADGE_CLASS } from "../lib/utils";

const MapPanel = dynamic(() => import("../components/MapPanel"), {
  ssr: false,
});

type IncidentCategory = "crash" | "disabled" | "hazard" | "closure" | "other";
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
  name?: string;
  base_lat: number;
  base_lng: number;
  radius_km: number;
  alert_enabled?: boolean;
  alert_crash?: boolean;
  alert_disabled?: boolean;
  alert_hazard?: boolean;
  alert_max_extra_km?: number;
};

type MinutesOption = 30 | 60 | 120;
type TypeFilter = "all" | IncidentCategory;

type Alert = {
  id: string;        // incident id
  title: string;
  body: string;
  createdAt: string; // ISO string
};

export default function Dashboard() {
  const router = useRouter();

  // -------- Auth guard --------
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
  const incidentsRef = useRef<Incident[]>([]);
  const [filtered, setFiltered] = useState<Incident[]>([]);
  const [minutes, setMinutes] = useState<MinutesOption>(60);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savingClaimId, setSavingClaimId] = useState<string | null>(null);

  // Alert engine state
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [liveTick, setLiveTick] = useState(0);

  // Truck assignment modal state
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimingIncident, setClaimingIncident] = useState<Incident | null>(null);
  const [trucks, setTrucks] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [drivers, setDrivers] = useState<Array<{ id: string; user_id: string }>>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  // -------- Load company --------
  useEffect(() => {
    if (!authChecked || !userId) return;

    (async () => {
      setErrorMsg(null);

      // Check if user is a driver first
      const { data: roleData } = await supabase
        .from("company_users")
        .select("role, company_id")
        .eq("user_id", userId)
        .maybeSingle();

      // If they're a driver (not owner), redirect to driver dashboard
      if (roleData && roleData.role === "driver") {
        router.replace("/driver-dashboard");
        return;
      }

      const { data, error } = await supabase
        .from("companies")
        .select(
          `
          id,
          name,
          base_lat,
          base_lng,
          radius_km,
          alert_enabled,
          alert_crash,
          alert_disabled,
          alert_hazard,
          alert_max_extra_km
        `
        )
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
          name: "Your Company",
          alert_enabled: true,
          alert_crash: true,
          alert_disabled: true,
          alert_hazard: false,
          alert_max_extra_km: 5,
        });
        return;
      }

      setCompany({
        id: data.id,
        name: data.name ?? "Your Company",
        base_lat: data.base_lat ?? 35.227085,
        base_lng: data.base_lng ?? -80.843124,
        radius_km: data.radius_km ?? 40,
        alert_enabled: data.alert_enabled ?? true,
        alert_crash: data.alert_crash ?? true,
        alert_disabled: data.alert_disabled ?? true,
        alert_hazard: data.alert_hazard ?? false,
        alert_max_extra_km: data.alert_max_extra_km ?? 5,
      });
    })();
  }, [authChecked, userId]);

  // -------- Browser notifications helper --------
  function triggerBrowserNotification(alert: Alert) {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      new Notification(alert.title, { body: alert.body });
    } else if (Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          new Notification(alert.title, { body: alert.body });
        }
      });
    }
  }

  // -------- Load incidents + merge claim status + generate alerts --------
  const fetchIncidents = useCallback(
    async (selectedMinutes?: MinutesOption) => {
      if (!company) return;
      const m = selectedMinutes ?? minutes;

      setLoading(true);
      setErrorMsg(null);

      try {
        const { data: { session } = {} } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await fetch(`/api/incidents-client?minutes=${m}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();

        if (!res.ok) {
          console.error(json);
          setErrorMsg(json.error || "Failed to load incidents.");
          setIncidents([]);
          incidentsRef.current = [];
          return;
        }

        const baseIncidents = (json.incidents || []) as Incident[];

        // Merge claim status
        let merged: Incident[] = baseIncidents;
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

          merged = baseIncidents.map((inc) => {
            const c = map.get(inc.id);
            return {
              ...inc,
              claim_status: c?.status ?? null,
              claim_note: c?.note ?? null,
            };
          });
        }

        // ---- Alert engine: detect new towable incidents using company rules ----
        const prevIds = new Set(incidentsRef.current.map((i) => i.id));
        const radiusKm = company.radius_km ?? 40;

        const alertEnabled = company.alert_enabled ?? true;
        const alertCrash = company.alert_crash ?? true;
        const alertDisabled = company.alert_disabled ?? true;
        const alertHazard = company.alert_hazard ?? false;
        const extraKm = company.alert_max_extra_km ?? 5;

        if (alertEnabled) {
          const newTowable = merged.filter((inc) => {
            if (prevIds.has(inc.id)) return false;

            const cat = classifyIncident(inc);
            const towable =
              (cat === "crash" && alertCrash) ||
              (cat === "disabled" && alertDisabled) ||
              (cat === "hazard" && alertHazard);

            if (!towable) return false;

            const dist = inc.distanceKm ?? radiusKm + extraKm + 1;
            return dist <= radiusKm + extraKm;
          });

          if (newTowable.length > 0) {
            setAlerts((prev) => {
              const now = new Date().toISOString();
              const added = newTowable.map<Alert>((i) => ({
                id: i.id,
                title: "New tow opportunity",
                body: `${CATEGORY_LABEL[classifyIncident(i)]} at ${
                  i.road || "unknown road"
                } — ~${(i.distanceKm ?? radiusKm).toFixed(
                  1
                )} km from your yard`,
                createdAt: now,
              }));

              const next = [...added, ...prev].slice(0, 5);
              triggerBrowserNotification(added[0]);
              return next;
            });
          }
        }

        setIncidents(merged);
        incidentsRef.current = merged;
      } catch (err: any) {
        console.error(err);
        setErrorMsg("Network error loading incidents.");
        setIncidents([]);
        incidentsRef.current = [];
      } finally {
        setLoading(false);
      }
    },
    [company, minutes]
  );

  useEffect(() => {
    if (!company) return;
    fetchIncidents();
  }, [company, minutes, fetchIncidents]);

  // -------- Realtime subscription with debouncing --------
  useEffect(() => {
    if (!company?.id) return;

    let debounceTimer: NodeJS.Timeout | null = null;

    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchIncidents();
        setLiveTick((n) => n + 1);
      }, 1000); // Wait 1s before fetching to batch rapid updates
    };

    const channel = supabase
      .channel("incidents-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "incidents" },
        debouncedFetch
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "incidents" },
        debouncedFetch
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [company?.id, fetchIncidents]);

  // -------- Filters --------
  useEffect(() => {
    let data = [...incidents];

    if (typeFilter !== "all") {
      data = data.filter((i) => classifyIncident(i) === typeFilter);
    }

    setFiltered(data);
  }, [incidents, typeFilter]);

  // -------- Stats --------
  const stats = useMemo(() => {
    const total = filtered.length;
    const counts: Record<IncidentCategory, number> = {
      crash: 0,
      disabled: 0,
      hazard: 0,
      closure: 0,
      other: 0,
    };
    let claimed = 0;

    filtered.forEach((i) => {
      const cat = classifyIncident(i);
      counts[cat] += 1;
      if (i.claim_status === "claimed") claimed += 1;
    });

    return {
      total,
      claimed,
      ...counts,
    };
  }, [filtered]);

  // -------- Load trucks and drivers --------
  useEffect(() => {
    if (!company?.id) return;

    (async () => {
      // Load trucks
      const { data: trucksData } = await supabase
        .from("trucks")
        .select("id, name, status")
        .eq("company_id", company.id)
        .eq("status", "available")
        .order("name");

      if (trucksData) {
        setTrucks(trucksData);
      }

      // Load drivers
      const { data: driversData } = await supabase
        .from("company_users")
        .select("id, user_id")
        .eq("company_id", company.id)
        .eq("role", "driver");

      if (driversData) {
        setDrivers(driversData);
      }
    })();
  }, [company?.id]);

  // -------- Claim actions --------
  function openClaimModal(incident: Incident) {
    setClaimingIncident(incident);
    setSelectedTruckId("");
    setSelectedDriverId("");
    setShowClaimModal(true);
  }

  async function handleClaimSubmit() {
    if (!company?.id || !claimingIncident || !selectedTruckId) return;

    setSavingClaimId(claimingIncident.id);
    setShowClaimModal(false);

    // Update claim with truck and driver assignment
    const { error: claimError } = await supabase
      .from("company_incident_claims")
      .upsert(
        {
          company_id: company.id,
          incident_id: claimingIncident.id,
          status: "claimed",
          truck_id: selectedTruckId,
          driver_user_id: selectedDriverId || null,
          claimed_at: new Date().toISOString(),
          note: claimingIncident.claim_note ?? null,
        },
        {
          onConflict: "company_id,incident_id",
        }
      );

    if (claimError) {
      console.error("Claim error:", claimError);
      setErrorMsg("Error claiming incident.");
      setSavingClaimId(null);
      return;
    }

    // Update truck status to on_job
    const { error: truckError } = await supabase
      .from("trucks")
      .update({ status: "on_job", updated_at: new Date().toISOString() })
      .eq("id", selectedTruckId);

    if (truckError) {
      console.error("Truck update error:", truckError);
    }

    await fetchIncidents();
    setSavingClaimId(null);
    setClaimingIncident(null);
  }

  async function handleMarkComplete(incident: Incident) {
    if (!company?.id) return;

    setSavingClaimId(incident.id);

    // Get the truck_id from the claim
    const { data: claimData } = await supabase
      .from("company_incident_claims")
      .select("truck_id")
      .eq("company_id", company.id)
      .eq("incident_id", incident.id)
      .single();

    // Mark claim as completed
    const { error: claimError } = await supabase
      .from("company_incident_claims")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("company_id", company.id)
      .eq("incident_id", incident.id);

    if (claimError) {
      console.error("Complete error:", claimError);
      setErrorMsg("Error marking complete.");
      setSavingClaimId(null);
      return;
    }

    // Set truck back to available
    if (claimData?.truck_id) {
      await supabase
        .from("trucks")
        .update({ status: "available", updated_at: new Date().toISOString() })
        .eq("id", claimData.truck_id);
    }

    await fetchIncidents();
    setSavingClaimId(null);
  }

  const center = useMemo(
    () =>
      company
        ? { lat: company.base_lat, lng: company.base_lng }
        : { lat: 35.227085, lng: -80.843124 },
    [company]
  );
  const radiusKm = useMemo(() => company?.radius_km ?? 40, [company?.radius_km]);

  // -------- Alert helpers --------
  function dismissAlert(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  function clearAlerts() {
    setAlerts([]);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Nav />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-4">
          {/* Header + Live pill */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-2xl font-semibold">Live Dashboard</h1>
                <p className="text-sm text-slate-400">
                  Watch incidents and claim jobs before anyone else.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-2">
                Time window:
                <select
                  value={minutes}
                  onChange={(e) =>
                    setMinutes(Number(e.target.value) as MinutesOption)
                  }
                  className="rounded-md bg-slate-900 border border-slate-700 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  <option value={30}>Last 30 min</option>
                  <option value={60}>Last 1 hour</option>
                  <option value={120}>Last 2 hours</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                Category:
                <select
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter(e.target.value as TypeFilter)
                  }
                  className="rounded-md bg-slate-900 border border-slate-700 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  <option value="all">All</option>
                  <option value="crash">Crashes</option>
                  <option value="disabled">Disabled vehicles</option>
                  <option value="hazard">Hazards</option>
                  <option value="closure">Closures</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <button
                onClick={() => fetchIncidents()}
                className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </header>

          {/* Alerts panel */}
          {alerts.length > 0 && (
            <section className="border border-emerald-500/40 bg-emerald-500/5 rounded-xl px-4 py-3 text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-emerald-200">
                    Live tow alerts
                  </span>
                  <span className="text-slate-400">
                    ({alerts.length} new in the last few minutes)
                  </span>
                </div>
                <button
                  onClick={clearAlerts}
                  className="text-slate-400 hover:text-slate-200"
                >
                  Clear
                </button>
              </div>
              <ul className="space-y-1">
                {alerts.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="text-slate-50">{a.title}</p>
                      <p className="text-slate-300">{a.body}</p>
                    </div>
                    <button
                      onClick={() => dismissAlert(a.id)}
                      className="text-slate-500 hover:text-slate-200 text-[11px]"
                    >
                      Dismiss
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Stats */}
          <section className="grid gap-3 md:grid-cols-5 text-xs mt-2">
            <div className="border border-slate-800 bg-slate-950/80 rounded-xl p-3">
              <p className="text-slate-400 mb-1">Total incidents</p>
              <p className="text-xl font-semibold text-slate-100">
                {stats.total}
              </p>
              <p className="text-slate-500 mt-1">
                Inside {radiusKm} km of your yard.
              </p>
            </div>
            <div className="border border-slate-800 bg-slate-950/80 rounded-xl p-3">
              <p className="text-slate-400 mb-1">Jobs claimed</p>
              <p className="text-xl font-semibold text-emerald-400">
                {stats.claimed}
              </p>
            </div>
            <div className="border border-slate-800 bg-slate-950/80 rounded-xl p-3">
              <p className="text-slate-400 mb-1">Crashes</p>
              <p className="text-xl font-semibold text-slate-100">
                {stats.crash}
              </p>
            </div>
            <div className="border border-slate-800 bg-slate-950/80 rounded-xl p-3">
              <p className="text-slate-400 mb-1">Disabled vehicles</p>
              <p className="text-xl font-semibold text-slate-100">
                {stats.disabled}
              </p>
            </div>
            <div className="border border-slate-800 bg-slate-950/80 rounded-xl p-3">
              <p className="text-slate-400 mb-1">Hazards / closures</p>
              <p className="text-xl font-semibold text-slate-100">
                {stats.hazard + stats.closure + stats.other}
              </p>
            </div>
          </section>

          {errorMsg && (
            <p className="text-sm text-rose-400 border border-rose-500/40 bg-rose-950/40 rounded-md px-3 py-2">
              {errorMsg}
            </p>
          )}

          {!loading && !errorMsg && filtered.length === 0 && (
            <p className="text-sm text-slate-400">
              No incidents found for this time window and coverage area.
            </p>
          )}

          {/* List + Map */}
          <section className="grid gap-4 md:grid-cols-[1.4fr,1.1fr] items-start">
            {/* Incident list */}
            <div className="border border-slate-800 bg-slate-950/80 rounded-xl p-3 text-xs max-h-[480px] overflow-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 bg-slate-950">
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Details</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3 text-right">Dist (km)</th>
                    <th className="py-2 pr-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inc) => {
                    const cat = classifyIncident(inc);
                    const claimStatus = inc.claim_status ?? null;

                    return (
                      <tr
                        key={inc.id}
                        className="border-b border-slate-900/60 hover:bg-slate-900/70"
                      >
                        <td className="py-1.5 pr-3 text-slate-300 whitespace-nowrap">
                          {new Date(inc.occurred_at).toLocaleTimeString()}
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
                        <td className="py-1.5 pr-0 text-right">
                          {!claimStatus ? (
                            <button
                              onClick={() => openClaimModal(inc)}
                              disabled={savingClaimId === inc.id}
                              className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-[11px] text-white disabled:bg-emerald-800"
                            >
                              {savingClaimId === inc.id ? "Saving…" : "Claim"}
                            </button>
                          ) : claimStatus === "claimed" ? (
                            <button
                              onClick={() => handleMarkComplete(inc)}
                              disabled={savingClaimId === inc.id}
                              className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-[11px] text-white disabled:bg-blue-800"
                            >
                              {savingClaimId === inc.id ? "Saving…" : "Mark done"}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Done
                            </span>
                          )}
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
                <span>{filtered.length} incident(s)</span>
              </div>
              <div className="border border-slate-800 bg-slate-950/80 rounded-xl p-2">
                <div className="h-[420px] w-full rounded-lg overflow-hidden">
                  {filtered.length > 0 && (
                    <MapPanel
                      incidents={filtered as any}
                      center={center}
                      radiusKm={radiusKm}
                    />
                  )}
                  {filtered.length === 0 && (
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

      {/* Claim Modal */}
      {showClaimModal && claimingIncident && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Claim Incident</h2>

            <div className="space-y-4">
              {/* Incident details */}
              <div className="border border-slate-800 bg-slate-950/60 rounded-lg p-3">
                <p className="text-sm font-medium text-slate-100 mb-1">
                  {claimingIncident.road || "Unknown location"}
                </p>
                <p className="text-xs text-slate-400">
                  {claimingIncident.description || "No details"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {claimingIncident.distanceKm?.toFixed(1)} km away
                </p>
              </div>

              {/* Truck selection */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Select Truck <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedTruckId}
                  onChange={(e) => setSelectedTruckId(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  <option value="">Choose a truck...</option>
                  {trucks.map((truck) => (
                    <option key={truck.id} value={truck.id}>
                      {truck.name} ({truck.status})
                    </option>
                  ))}
                </select>
                {trucks.length === 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    No available trucks. Add trucks in Fleet Management.
                  </p>
                )}
              </div>

              {/* Driver selection (optional) */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Assign Driver (optional)
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  <option value="">No driver assigned</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.user_id}>
                      Driver {driver.user_id.substring(0, 8)}...
                    </option>
                  ))}
                </select>
                {drivers.length === 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    No drivers available. Add drivers in Team Management.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowClaimModal(false);
                  setClaimingIncident(null);
                }}
                className="flex-1 px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleClaimSubmit}
                disabled={!selectedTruckId}
                className="flex-1 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Claim Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
