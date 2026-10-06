import { Link, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated } from '../../redux/slices/authSlice'
import { RiArrowRightLine, RiShieldCheckLine } from 'react-icons/ri'
import ICSRLogo from '../../assets/ICSR-LOGO.png'

export default function LandingPage() {
  const isAuthenticated = useSelector(selectIsAuthenticated)

  return (
    // NOTE: Root cause of your original bug — classes like `bg-brand-navy`,
    // `text-ink-inverse`, `brand-blue` were likely not defined in tailwind.config.js,
    // so Tailwind silently ignored them and text fell back to default (near-black)
    // colors on a dark background. Below uses Tailwind's built-in palette
    // (slate / blue / cyan) so colors ALWAYS resolve correctly, with every
    // hover state explicitly setting text color too.
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-white">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="h-16 flex items-center justify-between px-6 lg:px-12 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <img src={ICSRLogo} alt="ICSR Logo" className="h-10 w-auto object-contain" />
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="text-sm bg-blue-600 hover:bg-blue-500 text-white hover:text-white font-medium px-4 py-2 rounded-md transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-slate-300 hover:text-white font-medium px-3 py-2 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register/apply"
                className="text-sm bg-blue-600 hover:bg-blue-500 text-white hover:text-white font-medium px-4 py-2 rounded-md transition-colors"
              >
                Apply for Access
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="flex-1 relative flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden">

        {/* Ambient glow accents — purely decorative */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Faint grid texture */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:40px_40px]" />

        <div className="max-w-3xl relative z-10 space-y-6">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-400/20 px-4 py-1.5 rounded-full uppercase tracking-wider">
            <RiShieldCheckLine size={14} />
            Clinical intelligence platform
          </span>

          <h1 className="text-4xl lg:text-6xl font-light leading-tight text-white">
            Every patient.{' '}
            <span className="font-semibold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Every protocol.
            </span>
            <br />
            One clear line of sight.
          </h1>

          <p className="text-slate-300 text-base lg:text-lg max-w-2xl mx-auto font-light leading-relaxed">
            Onco Sphere unites patient registries, longitudinal EMR charting, and oncology workflow management in a clean, quiet interface designed for hospital networks and cancer centers.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to={isAuthenticated ? "/dashboard" : "/login"}
              className="group bg-blue-600 hover:bg-blue-500 text-white hover:text-white font-medium px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
            >
              {isAuthenticated ? "Open Dashboard" : "Sign in to platform"}
              <RiArrowRightLine className="group-hover:translate-x-1 transition-transform" />
            </Link>
            {!isAuthenticated && (
              <Link
                to="/register/apply"
                className="border border-white/20 hover:bg-white hover:text-slate-950 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                Apply as Researcher / Intern
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="bg-brand-navy/95 border-t border-white/5 py-12 px-6 text-center text-xs text-brand-light/50 space-y-4">
        <p className="max-w-md mx-auto leading-relaxed">
          Onco Sphere is a medical information registry designed strictly for institutional use. 
          Protected health information (PHI) access is audited continuously.
        </p>
        <p className="text-[10px]">
          &copy; {new Date().getFullYear()} Onco Sphere — Oncology Intelligence. All rights reserved.
        </p>
      </footer>
    </div>
  )
}