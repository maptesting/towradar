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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <>
      <nav className="glass-strong border-b border-slate-700/50 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl gradient-emerald shadow-glow flex items-center justify-center transition-transform group-hover:scale-110">
                <span className="text-xs sm:text-sm font-bold text-white">
                  TR
                </span>
              </div>
              <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                TowRadar
              </span>
            </Link>
            {user && (
              <div className="hidden md:flex items-center gap-2 text-sm ml-6">
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

          <div className="flex items-center gap-2 sm:gap-3">
            {!loading && user && (
              <>
                {/* Desktop Profile Dropdown */}
                <div className="hidden sm:block">
                  <ProfileDropdown userEmail={user.email} onLogout={handleLogout} />
                </div>
                
                {/* Mobile Hamburger Menu */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg glass hover:bg-white/5 transition-colors"
                  aria-label="Toggle menu"
                >
                  <svg
                    className="w-6 h-6 text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {mobileMenuOpen ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    )}
                  </svg>
                </button>
              </>
            )}

            {/* Show Login only when NOT logged in */}
            {!loading && !user && (
              <Link
                href="/auth"
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl gradient-emerald text-white text-sm font-semibold shadow-glow hover:shadow-glow-blue transition-all hover:scale-105"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && user && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="glass-strong w-64 h-full ml-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2">
              <div className="px-4 py-3 mb-4 glass rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent">
                <p className="text-xs text-slate-400">Signed in as</p>
                <p className="text-sm font-medium text-slate-200 truncate">{user.email}</p>
              </div>

              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg transition-all text-base ${
                  isActive("/dashboard")
                    ? "glass-strong text-emerald-400 shadow-glow"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                📊 Dashboard
              </Link>

              <Link
                href="/driver-dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg transition-all text-base ${
                  isActive("/driver-dashboard")
                    ? "glass-strong text-emerald-400 shadow-glow"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                🚛 Driver Dashboard
              </Link>

              <Link
                href="/history"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg transition-all text-base ${
                  isActive("/history")
                    ? "glass-strong text-emerald-400 shadow-glow"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                📜 History
              </Link>

              <Link
                href="/company"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg transition-all text-base ${
                  isActive("/company")
                    ? "glass-strong text-emerald-400 shadow-glow"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                🏢 Company
              </Link>

              <Link
                href="/trucks"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg transition-all text-base ${
                  isActive("/trucks")
                    ? "glass-strong text-emerald-400 shadow-glow"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                🚚 Trucks
              </Link>

              <Link
                href="/team"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg transition-all text-base ${
                  isActive("/team")
                    ? "glass-strong text-emerald-400 shadow-glow"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                👥 Team
              </Link>

              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg transition-all text-base ${
                  isActive("/settings")
                    ? "glass-strong text-emerald-400 shadow-glow"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                ⚙️ Settings
              </Link>

              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="mt-4 px-4 py-3 rounded-lg glass border border-rose-500/50 hover:bg-rose-500/10 text-rose-300 text-base font-medium transition-colors text-left"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
