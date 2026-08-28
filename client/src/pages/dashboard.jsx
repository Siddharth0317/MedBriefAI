import React from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuthStore } from '../store/authStore';
import { 
  Activity, 
  LogOut, 
  Stethoscope, 
  User, 
  ShieldCheck, 
  PlusCircle, 
  FileText, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Navigation Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-xl tracking-tight text-slate-900">
                  MedBrief<span className="text-cyan-600 font-extrabold">.AI</span>
                </span>
                <span className="ml-2.5 px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                  Workstation
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-semibold text-slate-900">{user?.name}</span>
                <span className="text-xs font-medium text-slate-500 capitalize">{user?.role} Account</span>
              </div>

              <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-cyan-300 text-xs font-medium mb-3 backdrop-blur-sm border border-white/10">
                  {user?.role === 'doctor' ? (
                    <>
                      <Stethoscope className="w-3.5 h-3.5" />
                      Clinician Portal
                    </>
                  ) : (
                    <>
                      <User className="w-3.5 h-3.5" />
                      Patient Portal
                    </>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Welcome back, {user?.name}
                </h1>
                <p className="mt-1 text-slate-300 text-sm max-w-xl">
                  {user?.role === 'doctor'
                    ? 'Review clinical SOAP briefings, investigate uploaded patient labs with RAG, and update triage status.'
                    : 'Submit your health symptoms, upload past lab records, and view AI-generated pre-consultation status.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-4 py-3 bg-white/10 rounded-xl border border-white/10 backdrop-blur-sm text-right">
                  <div className="text-xs text-cyan-200 font-medium">Session Status</div>
                  <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 justify-end">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Authenticated (Phase 1)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Role-Specific View Preview */}
          {user?.role === 'doctor' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Clinical Triage Queue</h2>
                  <p className="text-xs text-slate-500">All submitted patient questionnaires and SOAP status</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center mx-auto mb-3">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Doctor Workstation Initialized</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                  Phase 1 Authentication is complete. Multi-file PDF ingestion, SOAP summaries, and grounded RAG query chat will be activated in Phases 2-4.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono">
                  Role: doctor | User ID: {user?._id}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">My Clinical Intakes</h2>
                  <p className="text-xs text-slate-500">Track and manage your submitted symptom records</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Patient Intake Portal Initialized</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                  Your patient account is secured with JWT authentication. Multi-step symptom questionnaires and lab report PDF upload dropzone are scheduled for Phase 2.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono">
                  Role: patient | User ID: {user?._id}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
