import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import ClinicalSummaryCard from '../../components/ClinicalSummaryCard';
import RAGChatBox from '../../components/RAGChatBox';
import PrescriptionSlipModal from '../../components/PrescriptionSlipModal';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { 
  ArrowLeft, 
  User, 
  Clock, 
  Pill, 
  AlertTriangle, 
  FileText, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Eye, 
  X, 
  Stethoscope, 
  Sparkles,
  ClipboardList,
  ShieldCheck,
  Calendar,
  MessageSquare,
  Printer,
  Download
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'Submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
  { value: 'Under_Review', label: 'Under Review', color: 'bg-amber-100 text-amber-800' },
  { value: 'Briefing_Ready', label: 'Briefing Ready', color: 'bg-purple-100 text-purple-800' },
  { value: 'Completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-800' },
];

export default function IntakeDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuthStore();

  const [intake, setIntake] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status & Doctor Notes state
  const [status, setStatus] = useState('Submitted');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [completedActions, setCompletedActions] = useState([]);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI Generation state (Doctor only)
  const [isGeneratingSOAP, setIsGeneratingSOAP] = useState(false);

  // Document preview & Prescription modals
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);

  const fetchIntakeDetails = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/intake/${id}`);
      setIntake(res.data.intake);
      setDocuments(res.data.documents || []);
      setStatus(res.data.intake.status || 'Submitted');
      setDoctorNotes(res.data.intake.doctorNotes || '');
      setCompletedActions(res.data.intake.aiSummary?.completedActions || []);
    } catch (err) {
      console.error('Error fetching intake:', err);
      setError(err.response?.data?.message || 'Failed to load intake consultation.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIntakeDetails();
  }, [fetchIntakeDetails]);

  // Generate / Refresh AI Briefing (Doctor Only)
  const handleGenerateSOAP = async () => {
    if (user?.role !== 'doctor') return;
    setIsGeneratingSOAP(true);
    try {
      const res = await api.post(`/api/intake/${id}/generate-summary`);
      setIntake((prev) => ({
        ...prev,
        aiSummary: res.data.aiSummary,
        status: res.data.status,
      }));
      setStatus(res.data.status);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate AI SOAP briefing');
    } finally {
      setIsGeneratingSOAP(false);
    }
  };

  // Toggle Action Checklist item
  const handleToggleAction = (actionText) => {
    setCompletedActions((prev) => {
      const exists = prev.includes(actionText);
      const updated = exists
        ? prev.filter((item) => item !== actionText)
        : [...prev, actionText];
      return updated;
    });
  };

  // Save Status, Doctor Notes & Checklist state
  const handleSaveNotes = async () => {
    if (user?.role !== 'doctor') return;
    setIsSavingNotes(true);
    setSaveSuccess(false);
    try {
      const res = await api.put(`/api/intake/${id}`, {
        status,
        doctorNotes,
        completedActions,
      });
      setIntake(res.data.intake);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save consultation notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const isDoctor = user?.role === 'doctor';

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-100 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                href="/dashboard"
                className="p-2 rounded-xl text-slate-500 hover:text-cyan-700 hover:bg-slate-100 transition"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-px h-6 bg-slate-200"></div>
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm ${
                  isDoctor ? 'bg-cyan-600' : 'bg-slate-800'
                }`}>
                  {isDoctor ? <Stethoscope className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                </div>
                <div>
                  <h1 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                    {isDoctor ? 'Doctor Consultation Workstation' : 'Patient Intake Record'}
                  </h1>
                  <p className="text-[10px] text-slate-500">
                    Record ID: {id}
                  </p>
                </div>
              </div>
            </div>

            {/* Doctor Triage Controls */}
            {isDoctor ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 hidden sm:inline">Status:</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {doctorNotes && (
                  <button
                    type="button"
                    onClick={() => setShowPrescriptionModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-sm transition"
                    title="Preview & Print Official Prescription"
                  >
                    <Printer className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden sm:inline">Prescription</span>
                  </button>
                )}

                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {isSavingNotes ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Consultation</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Current Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  STATUS_OPTIONS.find((s) => s.value === intake?.status)?.color || 'bg-slate-100 text-slate-800'
                }`}>
                  {STATUS_OPTIONS.find((s) => s.value === intake?.status)?.label || intake?.status}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Content Body */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24">
            <Loader2 className="w-10 h-10 text-cyan-600 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-600">
              Loading clinical file...
            </p>
          </div>
        ) : error ? (
          <div className="max-w-xl mx-auto my-12 p-6 rounded-2xl bg-red-50 border border-red-200 text-center">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <h3 className="text-base font-bold text-red-900 mb-1">Error Loading Consultation</h3>
            <p className="text-xs text-red-700 mb-4">{error}</p>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : isDoctor ? (
          /* ========================================================================= */
          /* DOCTOR VIEW: 3-Column Consultation Workstation                            */
          /* ========================================================================= */
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {saveSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Clinical consultation notes and triage status saved successfully!</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: Patient Intake & Documents (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Patient Profile Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-sm">
                      {intake.patientId?.name?.[0]?.toUpperCase() || 'P'}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        {intake.patientId?.name || 'Patient'}
                      </h3>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                        Reported Symptoms:
                      </span>
                      <p className="text-slate-800 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200 leading-relaxed">
                        {intake.symptoms}
                      </p>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="font-semibold text-slate-500">Duration:</span>
                      <span className="font-bold text-slate-800">{intake.duration}</span>
                    </div>

                    <div>
                      <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                        Current Medications:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {intake.currentMedications && intake.currentMedications.length > 0 ? (
                          intake.currentMedications.map((m, i) => (
                            <span key={i} className="px-2 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-md font-medium text-[11px] flex items-center gap-1">
                              <Pill className="w-3 h-3 text-cyan-600" />
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">None reported</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                        Allergies:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {intake.allergies && intake.allergies.length > 0 ? (
                          intake.allergies.map((a, i) => (
                            <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-md font-medium text-[11px] flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              {a}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">No known drug allergies</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attached Medical Records & PDF Viewer */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-cyan-600" />
                      <span>Attached Records ({documents.length})</span>
                    </h4>
                  </div>

                  {documents.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No PDF documents attached.</p>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div
                          key={doc._id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-cyan-300 transition flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate" title={doc.fileName}>
                                {doc.fileName}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {doc.pageCount} page(s) • {doc.chunks?.length || 0} chunks embedded
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedDoc(doc)}
                            className="p-1.5 text-cyan-700 hover:bg-cyan-100 rounded-lg transition flex-shrink-0"
                            title="Inspect Extracted Text"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* CENTER COLUMN: AI SOAP Briefing Card (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <ClinicalSummaryCard
                  aiSummary={intake.aiSummary}
                  onGenerate={handleGenerateSOAP}
                  isGenerating={isGeneratingSOAP}
                  canEdit={true}
                  completedActions={completedActions}
                  onToggleAction={handleToggleAction}
                />
              </div>

              {/* RIGHT COLUMN: RAG Chat Assistant & Notes (3 cols) */}
              <div className="lg:col-span-3 space-y-6">
                {/* Doctor Clinical Notes */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Doctor Notes & Instructions
                    </h4>
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="text-[11px] text-cyan-700 hover:text-cyan-800 font-semibold"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Notes saved here will be shared with the patient as verified doctor instructions upon completion.
                  </p>
                  <textarea
                    rows={4}
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    placeholder="Add diagnostic notes, prescriptions, or referral remarks..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
                  />
                </div>

                {/* RAG Chat Box */}
                <RAGChatBox
                  intakeId={intake._id}
                  documentCount={documents.length}
                />
              </div>
            </div>
          </main>
        ) : (
          /* ========================================================================= */
          /* PATIENT VIEW: Patient Portal & Verified Doctor Consultation Summary       */
          /* ========================================================================= */
          <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Consultation Status Timeline */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-600" />
                <span>Consultation Progress Timeline</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'Submitted', label: '1. Submitted', desc: 'Received by clinic' },
                  { key: 'Under_Review', label: '2. Under Review', desc: 'Assigned to physician' },
                  { key: 'Briefing_Ready', label: '3. Briefing Ready', desc: 'Records prepared' },
                  { key: 'Completed', label: '4. Completed', desc: 'Consultation finished' },
                ].map((step, idx) => {
                  const statusOrder = ['Submitted', 'Under_Review', 'Briefing_Ready', 'Completed'];
                  const currentIndex = statusOrder.indexOf(intake.status);
                  const stepIndex = statusOrder.indexOf(step.key);
                  const isDone = currentIndex >= stepIndex;
                  const isCurrent = intake.status === step.key;

                  return (
                    <div
                      key={step.key}
                      className={`p-3 rounded-xl border transition ${
                        isCurrent
                          ? 'bg-cyan-50 border-cyan-300 ring-2 ring-cyan-500/20'
                          : isDone
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px]">
                            {idx + 1}
                          </div>
                        )}
                        <span className={isCurrent ? 'text-cyan-900' : isDone ? 'text-emerald-900' : ''}>
                          {step.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {step.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Doctor's Consultation Notes Card */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-5 bg-gradient-to-r from-slate-900 to-cyan-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">
                      Doctor's Consultation & Prescription Notes
                    </h3>
                    <p className="text-xs text-slate-300">
                      {intake.assignedDoctorId?.name ? `Attending: Dr. ${intake.assignedDoctorId.name}` : 'Medical Staff Review'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    intake.status === 'Completed' ? 'bg-emerald-500 text-white' : 'bg-amber-500/20 text-amber-300 border border-amber-400/20'
                  }`}>
                    {intake.status === 'Completed' ? 'Consultation Completed' : 'Pending Review'}
                  </span>

                  {intake.doctorNotes && (
                    <button
                      type="button"
                      onClick={() => setShowPrescriptionModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Download Prescription</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">
                {intake.doctorNotes ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                      {intake.doctorNotes}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs text-slate-500">
                      <p className="flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Verified clinical advice provided for this consultation record.</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowPrescriptionModal(true)}
                        className="text-cyan-700 hover:text-cyan-800 font-bold inline-flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Print Official Rx Slip</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-2">
                    <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">
                      Doctor's Review In Progress
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Your intake submission has been received by our clinic. Once the consulting physician completes the review, prescription details and clinical remarks will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Patient's Submitted Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <ClipboardList className="w-4 h-4 text-cyan-600" />
                <span>Your Submitted Intake Information</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Reported Symptoms</span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium">
                    {intake.symptoms}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Duration</span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold">
                    {intake.duration}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Current Medications</span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    {intake.currentMedications && intake.currentMedications.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {intake.currentMedications.map((m, i) => (
                          <span key={i} className="px-2 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-md font-medium">
                            {m}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">None reported</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Known Allergies</span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    {intake.allergies && intake.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {intake.allergies.map((a, i) => (
                          <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-md font-medium">
                            {a}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No known drug allergies</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Uploaded Documents List */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-600" />
                  <span>Uploaded Medical Documents ({documents.length})</span>
                </h4>

                {documents.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No documents attached.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {documents.map((doc) => (
                      <div
                        key={doc._id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate" title={doc.fileName}>
                              {doc.fileName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {doc.pageCount} page(s) • {(doc.fileSize / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedDoc(doc)}
                          className="p-1.5 text-cyan-700 hover:bg-cyan-100 rounded-lg transition flex-shrink-0"
                          title="Inspect Extracted Text"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        )}

        {/* Modal: Document Text Inspector */}
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-600" />
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {selectedDoc.fileName}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed bg-slate-50">
                {selectedDoc.extractedText || 'No text extracted.'}
              </div>

              <div className="p-3 border-t border-slate-200 bg-white flex justify-end">
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Official Prescription Slip */}
        {showPrescriptionModal && (
          <PrescriptionSlipModal
            intake={intake}
            documents={documents}
            onClose={() => setShowPrescriptionModal(false)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
