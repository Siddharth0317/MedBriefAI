import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuthStore } from '../store/authStore';
import RAGChunkPreview from '../components/RAGChunkPreview';
import api from '../services/api';
import { 
  Activity, 
  LogOut, 
  Stethoscope, 
  User, 
  PlusCircle, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  ChevronRight, 
  Filter, 
  Pill, 
  AlertTriangle,
  FileCheck
} from 'lucide-react';

const STATUS_BADGES = {
  Submitted: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    label: 'Submitted',
  },
  Under_Review: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    dot: 'bg-amber-500',
    label: 'Under Review',
  },
  Briefing_Ready: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
    label: 'Briefing Ready',
  },
  Completed: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    label: 'Completed',
  },
};

export default function Dashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [intakes, setIntakes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedRAG, setExpandedRAG] = useState({});

  const toggleRAG = (intakeId) => {
    setExpandedRAG((prev) => ({ ...prev, [intakeId]: !prev[intakeId] }));
  };

  const fetchIntakes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = selectedStatus !== 'all' ? `?status=${selectedStatus}` : '';
      const res = await api.get(`/api/intake${queryParams}`);
      setIntakes(res.data.intakes || []);
    } catch (err) {
      console.error('Error fetching intakes:', err);
      setError(err.response?.data?.message || 'Failed to load clinical intake queue.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    fetchIntakes();
  }, [fetchIntakes]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleUpdateStatus = async (intakeId, newStatus) => {
    setUpdatingId(intakeId);
    try {
      await api.put(`/api/intake/${intakeId}`, { status: newStatus });
      setIntakes((prev) =>
        prev.map((item) => (item._id === intakeId ? { ...item, status: newStatus } : item))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update intake status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteIntake = async (intakeId) => {
    if (!confirm('Are you sure you want to delete this clinical intake record and all attached documents?')) {
      return;
    }
    try {
      await api.delete(`/api/intake/${intakeId}`);
      setIntakes((prev) => prev.filter((item) => item._id !== intakeId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete intake');
    }
  };

  const filteredIntakes = intakes.filter((intake) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const patientName = intake.patientId?.name?.toLowerCase() || '';
    const symptoms = intake.symptoms?.toLowerCase() || '';
    return patientName.includes(query) || symptoms.includes(query);
  });

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Navigation Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-xl tracking-tight text-slate-900">
                  MedBrief<span className="text-cyan-600 font-extrabold">.AI</span>
                </span>
                <span className="ml-2.5 px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                  {user?.role === 'doctor' ? 'Clinical Triage' : 'Patient Portal'}
                </span>
              </div>
            </Link>

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
                      Doctor Workspace
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
                    ? 'Review clinical intakes, inspect extracted PDF lab reports, and manage consultation triage queues.'
                    : 'Submit your health symptoms, attach previous medical PDFs, and monitor doctor review progress.'}
                </p>
              </div>

              {user?.role === 'patient' && (
                <Link
                  href="/intake/new"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/30 transition flex-shrink-0"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>Start New Clinical Intake</span>
                </Link>
              )}
            </div>
          </div>

          {/* Toast on newly submitted */}
          {router.query.submitted && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-emerald-800 animate-fade-in shadow-sm">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="text-sm font-semibold">
                  Your clinical intake and medical documents were submitted successfully!
                </span>
              </div>
              <button
                onClick={() => router.replace('/dashboard', undefined, { shallow: true })}
                className="text-xs text-emerald-700 hover:underline font-medium"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Section Header & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {user?.role === 'doctor' ? 'Clinical Triage Queue' : 'My Submitted Intakes'}
              </h2>
              <p className="text-xs text-slate-500">
                {user?.role === 'doctor'
                  ? `Showing ${filteredIntakes.length} patient record(s)`
                  : `You have submitted ${intakes.length} intake record(s)`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={user?.role === 'doctor' ? 'Search patient or symptom...' : 'Search symptoms...'}
                  className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 w-48 sm:w-60 shadow-sm"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
                {['all', 'Submitted', 'Under_Review', 'Completed'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 py-1.5 rounded-lg transition capitalize ${
                      selectedStatus === status
                        ? 'bg-white text-cyan-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status === 'all' ? 'All' : status.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchIntakes}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-cyan-700 hover:bg-slate-50 transition shadow-sm"
                title="Refresh queue"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Intakes List */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-cyan-600 animate-spin mb-3" />
              <p className="text-xs text-slate-500 font-medium">Loading clinical records...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center text-red-700">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-sm font-semibold">{error}</p>
              <button
                onClick={fetchIntakes}
                className="mt-3 px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition"
              >
                Retry
              </button>
            </div>
          ) : filteredIntakes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                No clinical intake records found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
                {user?.role === 'patient'
                  ? 'You have not submitted any clinical questionnaires yet. Start your first intake now!'
                  : 'The triage queue is currently empty for the selected filters.'}
              </p>
              {user?.role === 'patient' && (
                <Link
                  href="/intake/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow-md transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create First Intake
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredIntakes.map((intake) => {
                const badge = STATUS_BADGES[intake.status] || STATUS_BADGES.Submitted;

                return (
                  <div
                    key={intake._id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm hover:shadow-md transition group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: Patient Info & Symptoms */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg} ${badge.border} ${badge.text}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                            {badge.label}
                          </span>

                          {user?.role === 'doctor' && intake.patientId && (
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-cyan-600" />
                              {intake.patientId.name} ({intake.patientId.email})
                            </span>
                          )}

                          <span className="text-slate-400 text-xs">•</span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(intake.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Symptoms snippet */}
                        <div className="mb-3">
                          <h4 className="text-sm font-bold text-slate-800 line-clamp-2">
                            {intake.symptoms}
                          </h4>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                            <span className="font-semibold text-slate-700">Duration:</span>
                            <span>{intake.duration}</span>
                          </div>
                        </div>

                        {/* Meds & Allergies & Docs chips */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {intake.currentMedications && intake.currentMedications.length > 0 && (
                            <div className="flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                              <Pill className="w-3 h-3 text-cyan-600" />
                              <span>{intake.currentMedications.length} Med(s)</span>
                            </div>
                          )}

                          {intake.allergies && intake.allergies.length > 0 && (
                            <div className="flex items-center gap-1 text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>{intake.allergies.length} Allergies</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleRAG(intake._id)}
                            className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition ${
                              expandedRAG[intake._id]
                                ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                                : 'bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100'
                            }`}
                          >
                            <FileCheck className="w-3 h-3" />
                            <span>
                              {intake.documentCount || 0} PDF Report(s) • {expandedRAG[intake._id] ? 'Hide RAG Search' : 'Explore Chunks'}
                            </span>
                          </button>
                        </div>

                        {/* Doctor Notes if present */}
                        {intake.doctorNotes && (
                          <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                            <span className="font-semibold text-slate-900 block mb-0.5">Doctor Notes:</span>
                            {intake.doctorNotes}
                          </div>
                        )}

                        {/* Expandable RAG Vector Search & Chunk Preview */}
                        {expandedRAG[intake._id] && (
                          <div className="mt-4 pt-4 border-t border-slate-100 animate-fade-in">
                            <RAGChunkPreview
                              intakeId={intake._id}
                              documentCount={intake.documentCount || 0}
                            />
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 flex-shrink-0">
                        {user?.role === 'doctor' && (
                          <div className="flex items-center gap-2">
                            <select
                              value={intake.status}
                              disabled={updatingId === intake._id}
                              onChange={(e) => handleUpdateStatus(intake._id, e.target.value)}
                              className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                              <option value="Submitted">Submitted</option>
                              <option value="Under_Review">Under Review</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </div>
                        )}

                        {user?.role === 'patient' && intake.status === 'Submitted' && (
                          <button
                            onClick={() => handleDeleteIntake(intake._id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                            title="Delete Intake"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
