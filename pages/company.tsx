// pages/company.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Nav from "../components/Nav";
import { supabase } from "../lib/supabaseClient";

type Company = {
  id?: string;
  user_id?: string;
  name: string;
  base_lat: number;
  base_lng: number;
  radius_km: number;
  alert_enabled: boolean;
  alert_crash: boolean;
  alert_disabled: boolean;
  alert_hazard: boolean;
  alert_max_extra_km: number;
};

export default function CompanyPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Auth guard
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

  // Load or init company
  useEffect(() => {
    if (!authChecked || !userId) return;

    (async () => {
      setLoading(true);
      setErrorMsg(null);
      setSavedMsg(null);

      const { data, error } = await supabase
        .from("companies")
        .select(
          `
          id,
          user_id,
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
        setLoading(false);
        return;
      }

      if (!data) {
        // sensible defaults for Charlotte, NC
        setCompany({
          name: "",
          base_lat: 35.227085,
          base_lng: -80.843124,
          radius_km: 40,
          alert_enabled: true,
          alert_crash: true,
          alert_disabled: true,
          alert_hazard: false,
          alert_max_extra_km: 5,
        });
      } else {
        setCompany({
          name: data.name ?? "",
          base_lat: data.base_lat ?? 35.227085,
          base_lng: data.base_lng ?? -80.843124,
          radius_km: data.radius_km ?? 40,
          alert_enabled:
            data.alert_enabled ?? true,
          alert_crash:
            data.alert_crash ?? true,
          alert_disabled:
            data.alert_disabled ?? true,
          alert_hazard:
            data.alert_hazard ?? false,
          alert_max_extra_km:
            data.alert_max_extra_km ?? 5,
          id: data.id,
          user_id: data.user_id,
        });
      }

      setLoading(false);
    })();
  }, [authChecked, userId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!company || !userId) return;

    setSaving(true);
    setErrorMsg(null);
    setSavedMsg(null);

    try {
      const payload = {
        user_id: userId,
        name: company.name || null,
        base_lat: Number(company.base_lat),
        base_lng: Number(company.base_lng),
        radius_km: Number(company.radius_km),
        alert_enabled: company.alert_enabled,
        alert_crash: company.alert_crash,
        alert_disabled: company.alert_disabled,
        alert_hazard: company.alert_hazard,
        alert_max_extra_km: Number(company.alert_max_extra_km),
      };

      const { data, error } = await supabase
        .from("companies")
        .upsert(payload, {
          onConflict: "user_id",
          ignoreDuplicates: false,
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error("Company save error:", error);
        setErrorMsg("Failed to save company profile.");
      } else if (data) {
        setCompany((prev) =>
          prev
            ? {
                ...prev,
                ...payload,
                id: data.id,
                user_id: data.user_id,
              }
            : { ...payload, id: data.id, user_id: data.user_id }
        );
        setSavedMsg("Company settings saved.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!authChecked || loading || !company) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
        <Nav />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-slate-400 text-sm">Loading company…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Nav />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold">
              Company settings
            </h1>
            <p className="text-sm text-slate-400">
              Set your yard location, coverage radius, and alert rules.
            </p>
          </header>

          {errorMsg && (
            <p className="text-sm text-rose-400 border border-rose-500/40 bg-rose-950/40 rounded-md px-3 py-2">
              {errorMsg}
            </p>
          )}
          {savedMsg && (
            <p className="text-sm text-emerald-300 border border-emerald-500/40 bg-emerald-950/30 rounded-md px-3 py-2">
              {savedMsg}
            </p>
          )}

          <form onSubmit={handleSave} className="space-y-6 text-sm">
            {/* Basic info */}
            <section className="border border-slate-800 bg-slate-950/80 rounded-xl p-4 space-y-4">
              <h2 className="font-medium text-slate-100">
                Company profile
              </h2>
              <div className="space-y-2">
                <label className="block text-xs text-slate-400 mb-1">
                  Company name
                </label>
                <input
                  type="text"
                  value={company.name}
                  onChange={(e) =>
                    setCompany({ ...company, name: e.target.value })
                  }
                  className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  placeholder="e.g. Queen City Towing"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Yard latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={company.base_lat}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        base_lat: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Yard longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={company.base_lng}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        base_lng: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Coverage radius (km)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={company.radius_km}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        radius_km: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              </div>
            </section>

            {/* Alert rules */}
            <section className="border border-slate-800 bg-slate-950/80 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-medium text-slate-100">
                  Alert rules
                </h2>
                <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={company.alert_enabled}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        alert_enabled: e.target.checked,
                      })
                    }
                    className="rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  Enable alerts
                </label>
              </div>

              <p className="text-xs text-slate-400">
                Choose which incident types should trigger a tow alert
                when they appear inside (or just outside) your
                coverage area.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={company.alert_crash}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        alert_crash: e.target.checked,
                      })
                    }
                    className="rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Crashes</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={company.alert_disabled}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        alert_disabled: e.target.checked,
                      })
                    }
                    className="rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Disabled vehicles</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={company.alert_hazard}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        alert_hazard: e.target.checked,
                      })
                    }
                    className="rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Hazards</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Extra distance buffer (km)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={company.alert_max_extra_km}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        alert_max_extra_km: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Example: radius = 40km, buffer = 5km → alerts up to
                    45km away.
                  </p>
                </div>
              </div>
            </section>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:bg-emerald-800"
              >
                {saving ? "Saving…" : "Save settings"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
