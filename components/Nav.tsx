// components/Nav.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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
    <nav className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
              <span className="text-xs font-bold text-emerald-300">
                TR
              </span>
            </div>
            <span className="font-semibold text-sm tracking-tight">
              TowRadar
            </span>
          </Link>
          {user && (
            <div className="hidden sm:flex items-center gap-2 text-xs ml-4">
              <Link
                href="/dashboard"
                className={`px-2 py-1 rounded-md ${
                  isActive("/dashboard")
                    ? "bg-slate-800 text-slate-50"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/history"
                className={`px-2 py-1 rounded-md ${
                  isActive("/history")
                    ? "bg-slate-800 text-slate-50"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                History
              </Link>
              <Link
                href="/company"
                className={`px-2 py-1 rounded-md ${
                  isActive("/company")
                    ? "bg-slate-800 text-slate-50"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                Company
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs">
          {!loading && user && (
            <>
              <span className="hidden sm:inline text-slate-400">
                {user.email || "Account"}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700/60"
              >
                Sign out
              </button>
            </>
          )}

          {/* Show Login only when NOT logged in */}
          {!loading && !user && (
            <Link
              href="/auth"
              className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
