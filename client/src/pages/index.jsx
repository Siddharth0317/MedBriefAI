import React from 'react';
import Link from 'next/link';
import { 
  Activity, 
  FileText, 
  ShieldCheck, 
  Sparkles, 
  Stethoscope, 
  ArrowRight, 
  CheckCircle2,
  Clock,
  Search
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-cyan-50/20 to-slate-100">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-cyan-900 to-cyan-700 bg-clip-text text-transparent">
                MedBrief<span className="text-cyan-600 font-extrabold">.AI</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold bg-cyan-100 text-cyan-800 rounded-full">
                Phase 1 Active
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-sm transition shadow-sm"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-cyan-600 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-sm transition shadow-sm hover:shadow-md shadow-cyan-500/10"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100/80 border border-cyan-200 text-cyan-800 text-xs font-semibold uppercase tracking-wider mb-6 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Driven Clinical Triage & SOAP Briefing
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            Transform Complex Patient Records into{' '}
            <span className="bg-gradient-to-r from-cyan-600 to-teal-500 bg-clip-text text-transparent">
              Doctor-Ready Briefings
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Eliminate 15–20 minutes of manual chart review per consultation. MedBrief_AI extracts symptoms and lab PDFs into structured SOAP summaries with grounded RAG search.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-base shadow-lg shadow-cyan-600/25 transition flex items-center justify-center gap-2"
            >
              Start Intake as Patient / Doctor
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-300 bg-white/80 hover:bg-white text-slate-700 font-semibold text-base shadow-sm transition flex items-center justify-center"
            >
              Existing Account Login
            </Link>
          </div>

          {/* Quick Stats / Badges */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
            <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">75% Time Saved</h3>
              <p className="text-sm text-slate-600 mt-1">Instant pre-consultation briefings cut chart deciphering time down to seconds.</p>
            </div>

            <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Citation-Backed RAG</h3>
              <p className="text-sm text-slate-600 mt-1">Doctors can interrogate patient documents with direct citations and excerpts.</p>
            </div>

            <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Secure & Role-Gated</h3>
              <p className="text-sm text-slate-600 mt-1">Strict JWT authentication, bcrypt cost-12 hashing, and isolated patient/doctor workspaces.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MedBrief_AI &copy; {new Date().getFullYear()} — Clinical Triage & Intake System</span>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Phase 1 Online
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
