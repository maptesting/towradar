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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Nav />

      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Settings</h1>
          <p className="text-slate-400">Manage your notification preferences</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-4 bg-emerald-900/20 border border-emerald-700 rounded-lg text-emerald-400">
            {successMsg}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading settings...</div>
        ) : (
          <div className="space-y-6">
            {/* Browser Permission */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Browser Notifications</h2>
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-slate-300 font-medium">Browser Permission</p>
                  <p className="text-sm text-slate-500">
                    {browserPermission === "granted" && "✅ Notifications are enabled"}
                    {browserPermission === "denied" && "❌ Notifications are blocked"}
                    {browserPermission === "default" && "⚠️ Notifications not yet allowed"}
                  </p>
                </div>
                {browserPermission !== "granted" && (
                  <button
                    onClick={handleRequestPermission}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium transition-colors"
                  >
                    Enable Notifications
                  </button>
                )}
              </div>

              {browserPermission === "denied" && (
                <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg text-yellow-400 text-sm">
                  <strong>Note:</strong> You've blocked notifications. To enable them, click the lock icon in your browser's address bar and allow notifications for this site.
                </div>
              )}
            </div>

            {/* Notification Settings */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>

              <div className="space-y-4">
                {/* Enable Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 font-medium">Enable Notifications</p>
                    <p className="text-sm text-slate-500">Receive alerts for new incidents and job updates</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications_enabled}
                      onChange={(e) => setSettings({ ...settings, notifications_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Enable Sound */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 font-medium">Enable Sound</p>
                    <p className="text-sm text-slate-500">Play sound for high-priority notifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.sound_enabled}
                      onChange={(e) => setSettings({ ...settings, sound_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Quiet Hours */}
                <div className="pt-4 border-t border-slate-800">
                  <p className="text-slate-300 font-medium mb-3">Quiet Hours</p>
                  <p className="text-sm text-slate-500 mb-4">No notifications during these hours (optional)</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Start Time</label>
                      <input
                        type="time"
                        value={settings.quiet_hours_start || ""}
                        onChange={(e) => setSettings({ ...settings, quiet_hours_start: e.target.value || null })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">End Time</label>
                      <input
                        type="time"
                        value={settings.quiet_hours_end || ""}
                        onChange={(e) => setSettings({ ...settings, quiet_hours_end: e.target.value || null })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  
                  {settings.quiet_hours_start && settings.quiet_hours_end && (
                    <p className="mt-2 text-xs text-slate-500">
                      No notifications between {settings.quiet_hours_start} and {settings.quiet_hours_end}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => router.back()}
                className="px-6 py-2 border border-slate-700 hover:bg-slate-800 rounded-lg text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-medium transition-colors"
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
