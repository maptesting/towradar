// pages/index.tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* NAV */}
      <header className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            TowRadar
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="text-slate-300 hover:text-white">
              Dashboard
            </Link>
            <Link href="/history" className="text-slate-300 hover:text-white">
              History
            </Link>
            <Link href="/company" className="text-slate-300 hover:text-white">
              Company Settings
            </Link>
            <Link
              href="/auth"
              className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 transition text-white"
            >
              Log In
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="flex-1 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              Detect breakdowns & crashes{" "}
              <span className="text-emerald-400">before anyone else.</span>
            </h1>
            <p className="text-lg text-slate-300 max-w-lg">
              TowRadar monitors NC's live roadway data for breakdowns, disabled
              vehicles, crashes, and hazards — filtered to your service area,
              updated every few minutes.
            </p>
            <div className="flex gap-4 pt-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition"
              >
                View Live Dashboard
              </Link>
              <Link
                href="/company"
                className="px-6 py-3 rounded-md bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
              >
                Set Coverage Area
              </Link>
            </div>
          </div>

          {/* Demo Panel - Dashboard Preview */}
          <div className="rounded-2xl glass-strong p-6 shadow-2xl">
            <div className="space-y-4">
              {/* Mini header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-emerald-400">Live Dashboard</h3>
                  <p className="text-xs text-slate-400">Real-time incident monitoring</p>
                </div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold glass shadow-glow">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-300">Live</span>
                </span>
              </div>

              {/* Mock stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="glass rounded-lg p-3">
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-2xl font-bold text-slate-100">24</p>
                </div>
                <div className="glass rounded-lg p-3">
                  <p className="text-xs text-slate-400">Crashes</p>
                  <p className="text-2xl font-bold text-rose-400">8</p>
                </div>
                <div className="glass rounded-lg p-3">
                  <p className="text-xs text-slate-400">Disabled</p>
                  <p className="text-2xl font-bold text-amber-400">12</p>
                </div>
              </div>

              {/* Mock incident cards */}
              <div className="space-y-2">
                <div className="glass rounded-lg p-3 border-l-4 border-rose-500">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">CRASH</span>
                      <p className="text-sm font-medium text-slate-100 mt-1">I-85 North @ Exit 45</p>
                      <p className="text-xs text-slate-400 mt-0.5">2.3 km from base • 5 min ago</p>
                    </div>
                    <button className="px-3 py-1 rounded-lg gradient-emerald text-white text-xs font-semibold">
                      Claim
                    </button>
                  </div>
                </div>

                <div className="glass rounded-lg p-3 border-l-4 border-amber-500">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">DISABLED</span>
                      <p className="text-sm font-medium text-slate-100 mt-1">Highway 74 @ Mile 12</p>
                      <p className="text-xs text-slate-400 mt-0.5">5.1 km from base • 12 min ago</p>
                    </div>
                    <button className="px-3 py-1 rounded-lg gradient-emerald text-white text-xs font-semibold">
                      Claim
                    </button>
                  </div>
                </div>

                <div className="glass rounded-lg p-3 border-l-4 border-blue-500 opacity-60">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">HAZARD</span>
                      <p className="text-sm font-medium text-slate-100 mt-1">I-485 Inner Loop @ Exit 30</p>
                      <p className="text-xs text-slate-400 mt-0.5">8.7 km from base • 18 min ago</p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 text-center pt-2">
                ✨ Real dashboard updates every minute
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl font-semibold text-center mb-12">
            How TowRadar Works
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-3 p-5 rounded-xl border border-slate-800 bg-slate-900/40">
              <h3 className="font-semibold text-lg">1. Set your location</h3>
              <p className="text-slate-400 text-sm">
                Enter your base yard location and radius in Company Settings.
              </p>
            </div>

            <div className="space-y-3 p-5 rounded-xl border border-slate-800 bg-slate-900/40">
              <h3 className="font-semibold text-lg">2. We monitor NC highways</h3>
              <p className="text-slate-400 text-sm">
                TowRadar checks NCDOT’s live feed for crashes, disabled
                vehicles, lane closures, hazards, and incidents.
              </p>
            </div>

            <div className="space-y-3 p-5 rounded-xl border border-slate-800 bg-slate-900/40">
              <h3 className="font-semibold text-lg">3. Your dashboard updates</h3>
              <p className="text-slate-400 text-sm">
                Every few minutes TowRadar updates your view with new incidents
                filtered to your radius & service area.
              </p>
            </div>

            <div className="space-y-3 p-5 rounded-xl border border-slate-800 bg-slate-900/40">
              <h3 className="font-semibold text-lg">4. You respond faster</h3>
              <p className="text-slate-400 text-sm">
                Get ahead of competitors by knowing about breakdowns before
                they’re even reported.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl font-semibold">
            Ready to see what’s happening on Charlotte roads?
          </h2>
          <p className="text-slate-400">
            Set your coverage area and TowRadar will filter incidents
            automatically.
          </p>
          <Link
            href="/company"
            className="inline-block px-6 py-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition"
          >
            Configure Company Profile
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 border-t border-slate-800 text-center text-xs text-slate-500">
        TowRadar © {new Date().getFullYear()} • Live incident intelligence for tow companies
      </footer>
    </div>
  );
}
