// components/Nav.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import ProfileDropdown from "./ProfileDropdown";

type SimpleUser = {
  id: string;
  email?: string | null;
};

export default function Nav() {
  const router = useRouter();
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(
        data?.user
          ? { id: data.user.id, email: data.user.email }
          : null
      );
      setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
  };

  const isActive = (path: string) => router.pathname === path;

  return (
    <nav className="glass-strong border-b border-slate-700/50 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl gradient-emerald shadow-glow flex items-center justify-center transition-transform group-hover:scale-110">
              <span className="text-sm font-bold text-white">
                TR
              </span>
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              TowRadar
            </span>
          </Link>
          {user && (
            <div className="hidden sm:flex items-center gap-2 text-sm ml-6">
              <Link
                href="/dashboard"
                className={`px-4 py-2 rounded-lg transition-all ${
                  isActive("/dashboard")
                    ? "glass-strong text-emerald-400 shadow-glow"
                    : "text-slate-300 hover:text-slate-50 hover:bg-white/5"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/history"
                className={`px-4 py-2 rounded-lg transition-all ${
                  isActive("/history")
                    ? "glass-strong text-emerald-400 shadow-glow"
                    : "text-slate-300 hover:text-slate-50 hover:bg-white/5"
                }`}
              >
                History
              </Link>
              <Link
                href="/company"
                className={`px-4 py-2 rounded-lg transition-all ${
                  isActive("/company")
                    ? "glass-strong text-emerald-400 shadow-glow"
                    : "text-slate-300 hover:text-slate-50 hover:bg-white/5"
                }`}
              >
                Company
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs">
          {!loading && user && (
            <ProfileDropdown userEmail={user.email} onLogout={handleLogout} />
          )}

          {/* Show Login only when NOT logged in */}
          {!loading && !user && (
            <Link
              href="/auth"
              className="px-5 py-2.5 rounded-xl gradient-emerald text-white font-semibold shadow-glow hover:shadow-glow-blue transition-all hover:scale-105"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
