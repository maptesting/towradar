// pages/settings.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Nav from "../components/Nav";
import { supabase } from "../lib/supabaseClient";
import { requestNotificationPermission, areNotificationsEnabled } from "../lib/notifications";

type UserSettings = {
  notifications_enabled: boolean;
  sound_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

export default function Settings() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserSettings>({
    notifications_enabled: true,
    sound_enabled: true,
    quiet_hours_start: null,
    quiet_hours_end: null,
  });

  const [browserPermission, setBrowserPermission] = useState<"granted" | "denied" | "default">("default");

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

      // Check browser notification permission
      if ("Notification" in window) {
        setBrowserPermission(Notification.permission);
      }
    })();
  }, [router]);

  // Load settings
  useEffect(() => {
    if (!authChecked || !userId) return;

    (async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        // Check if user_settings table exists, if not use defaults
        const { data, error } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("Settings load error:", error);
          setErrorMsg("Error loading settings.");
          return;
        }

        if (data) {
          const loadedSettings = {
            notifications_enabled: data.notifications_enabled ?? true,
            sound_enabled: data.sound_enabled ?? true,
            quiet_hours_start: data.quiet_hours_start ?? null,
            quiet_hours_end: data.quiet_hours_end ?? null,
          };
          setSettings(loadedSettings);
          
          // Sync to localStorage
          localStorage.setItem("notifications_enabled", String(loadedSettings.notifications_enabled));
          localStorage.setItem("notification_sound_enabled", String(loadedSettings.sound_enabled));
          localStorage.setItem("quiet_hours_start", loadedSettings.quiet_hours_start || "");
          localStorage.setItem("quiet_hours_end", loadedSettings.quiet_hours_end || "");
        }
      } catch (err) {
        console.error("Load error:", err);
        setErrorMsg("Error loading settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, [authChecked, userId]);

  async function handleSave() {
    if (!userId) return;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: userId,
          notifications_enabled: settings.notifications_enabled,
          sound_enabled: settings.sound_enabled,
          quiet_hours_start: settings.quiet_hours_start,
          quiet_hours_end: settings.quiet_hours_end,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Save error:", error);
        setErrorMsg("Error saving settings.");
        return;
      }

      // Save to localStorage for immediate access by notification system
      localStorage.setItem("notifications_enabled", String(settings.notifications_enabled));
      localStorage.setItem("notification_sound_enabled", String(settings.sound_enabled));
      localStorage.setItem("quiet_hours_start", settings.quiet_hours_start || "");
      localStorage.setItem("quiet_hours_end", settings.quiet_hours_end || "");

      setSuccessMsg("Settings saved successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Save error:", err);
      setErrorMsg("Error saving settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestPermission() {
    const granted = await requestNotificationPermission();
    setBrowserPermission(granted ? "granted" : "denied");
    
    if (granted) {
      setSuccessMsg("Notifications enabled!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg("Notifications were denied. Check your browser settings.");
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-100">
      <Nav />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent mb-3">Settings</h1>
          <p className="text-base text-slate-400">Manage your notification preferences</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-5 glass-strong border border-rose-500/50 rounded-2xl text-rose-400 shadow-glow">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-5 glass-strong border border-emerald-500/50 rounded-2xl text-emerald-400 shadow-glow">
            {successMsg}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-lg">Loading settings...</div>
        ) : (
          <div className="space-y-6">
            {/* Browser Permission */}
            <div className="glass-strong rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-2xl font-bold mb-6 text-slate-200">Browser Notifications</h2>
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-slate-200 font-semibold text-lg">Browser Permission</p>
                  <p className="text-sm text-slate-400 mt-2">
                    {browserPermission === "granted" && "✅ Notifications are enabled"}
                    {browserPermission === "denied" && "❌ Notifications are blocked"}
                    {browserPermission === "default" && "⚠️ Notifications not yet allowed"}
                  </p>
                </div>
                {browserPermission !== "granted" && (
                  <button
                    onClick={handleRequestPermission}
                    className="px-6 py-3 gradient-emerald rounded-lg text-white font-semibold shadow-glow hover:scale-105 transition-transform"
                  >
                    Enable Notifications
                  </button>
                )}
              </div>

              {browserPermission === "denied" && (
                <div className="mt-4 p-4 glass rounded-xl border border-amber-500/50 text-amber-300 text-sm bg-gradient-to-br from-amber-500/10 to-transparent">
                  <strong>Note:</strong> You've blocked notifications. To enable them, click the lock icon in your browser's address bar and allow notifications for this site.
                </div>
              )}
            </div>

            {/* Notification Settings */}
            <div className="glass-strong rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-2xl font-bold mb-6 text-slate-200">Notification Preferences</h2>

              <div className="space-y-6">
                {/* Enable Notifications */}
                <div className="flex items-center justify-between p-4 glass rounded-xl border border-slate-700/50">
                  <div>
                    <p className="text-slate-200 font-semibold text-lg">Enable Notifications</p>
                    <p className="text-sm text-slate-400 mt-1">Receive alerts for new incidents and job updates</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications_enabled}
                      onChange={(e) => setSettings({ ...settings, notifications_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 glass peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-teal-500 shadow-glow"></div>
                  </label>
                </div>

                {/* Enable Sound */}
                <div className="flex items-center justify-between p-4 glass rounded-xl border border-slate-700/50">
                  <div>
                    <p className="text-slate-200 font-semibold text-lg">Enable Sound</p>
                    <p className="text-sm text-slate-400 mt-1">Play sound for high-priority notifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.sound_enabled}
                      onChange={(e) => setSettings({ ...settings, sound_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 glass peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-teal-500 shadow-glow"></div>
                  </label>
                </div>

                {/* Quiet Hours */}
                <div className="p-4 glass rounded-xl border border-slate-700/50">
                  <p className="text-slate-200 font-semibold text-lg mb-2">Quiet Hours</p>
                  <p className="text-sm text-slate-400 mb-5">No notifications during these hours (optional)</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Start Time</label>
                      <input
                        type="time"
                        value={settings.quiet_hours_start || ""}
                        onChange={(e) => setSettings({ ...settings, quiet_hours_start: e.target.value || null })}
                        className="w-full px-4 py-3 glass border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">End Time</label>
                      <input
                        type="time"
                        value={settings.quiet_hours_end || ""}
                        onChange={(e) => setSettings({ ...settings, quiet_hours_end: e.target.value || null })}
                        className="w-full px-4 py-3 glass border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      />
                    </div>
                  </div>
                  
                  {settings.quiet_hours_start && settings.quiet_hours_end && (
                    <p className="mt-3 text-sm text-emerald-400">
                      🌙 No notifications between {settings.quiet_hours_start} and {settings.quiet_hours_end}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4 pt-4">
              <button
                onClick={() => router.back()}
                className="px-8 py-3 glass border border-slate-700/50 hover:bg-white/5 rounded-lg text-slate-300 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 gradient-emerald disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold shadow-glow hover:scale-105 transition-transform disabled:hover:scale-100"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
