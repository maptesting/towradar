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

          {/* Demo Panel */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 shadow-lg shadow-black/50">
            <div className="aspect-video w-full rounded-lg bg-slate-800 animate-pulse flex items-center justify-center text-slate-500">
              Dashboard Preview Coming Soon
            </div>
            <p className="text-xs text-slate-500 text-center mt-2">
              Live dashboard preview placeholder
            </p>
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
