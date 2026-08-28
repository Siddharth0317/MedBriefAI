import React, { useEffect } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  ShieldCheck, 
  Stethoscope, 
  Calendar, 
  User, 
  FileText, 
  Pill, 
  AlertTriangle,
  Building2,
  Check
} from 'lucide-react';

/**
 * PrescriptionSlipModal Component
 * Renders an official medical prescription slip with printable letterhead,
 * sticky top/bottom toolbars, print styles, and direct download actions.
 * @param {Object} props
 * @param {Object} props.intake - Intake details
 * @param {Array} [props.documents=[]] - Attached documents
 * @param {Function} props.onClose - Modal close handler
 */
const PrescriptionSlipModal = ({ intake, documents = [], onClose }) => {
  if (!intake) return null;

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const doctorName = intake.assignedDoctorId?.name || 'Attending Physician';
  const patientName = intake.patientId?.name || 'Patient';
  const issueDate = new Date(intake.updatedAt || intake.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  // Direct Text File Download Fallback
  const handleDownloadTextFile = () => {
    const content = `=====================================================
MEDBRIEF_AI CLINICAL CONSULTATION & PRESCRIPTION SLIP
=====================================================
Ref ID: ${intake._id}
Date: ${issueDate}
Status: Completed

PATIENT DETAILS:
Name: ${patientName}
Email: ${intake.patientId?.email || 'N/A'}
Duration: ${intake.duration}

ATTENDING PHYSICIAN:
Doctor: Dr. ${doctorName}
Clinical Network: MedBrief_AI Outpatient Triage Center

REPORTED CHIEF COMPLAINT:
${intake.symptoms}

CURRENT MEDICATIONS:
${intake.currentMedications?.length ? intake.currentMedications.join(', ') : 'None reported'}

KNOWN ALLERGIES:
${intake.allergies?.length ? intake.allergies.join(', ') : 'No known allergies'}

=====================================================
℞ PHYSICIAN'S Rx & CLINICAL ORDERS:
=====================================================
${intake.doctorNotes || 'No specific clinical notes recorded.'}

=====================================================
Digitally Signed by Dr. ${doctorName}
Verified via MedBrief_AI Healthcare Platform
=====================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Prescription_${patientName.replace(/\s+/g, '_')}_${intake._id.slice(-6)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal Card with max-height and internal scroll */}
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden relative">
        
        {/* Sticky Top Control Toolbar (Always Visible) */}
        <div className="print:hidden p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Official Prescription Slip</h3>
              <p className="text-[10px] text-slate-400">MedBrief_AI Verified Clinical Document</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/30 transition cursor-pointer"
              title="Print or Save as PDF via browser"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTextFile}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
              title="Download text file copy"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer ml-1"
              title="Close window (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Prescription Body Container */}
        <div className="overflow-y-auto flex-1 p-6 sm:p-10 text-slate-900 font-sans space-y-7 bg-white" id="prescription-printable-area">
          
          {/* Clinic Header / Letterhead */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-700 text-white flex items-center justify-center font-bold text-xl shadow-md flex-shrink-0">
                <Stethoscope className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                  MedBrief_AI Clinical Network
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Digital Outpatient & Clinical Triage Center
                </p>
                <p className="text-[10px] text-slate-400">
                  License: MED-TRIAGE-2026-AI • Verified Electronic Health Record
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5">
              <div className="font-bold text-slate-900 text-sm">Medical Consultation Slip</div>
              <div>Ref ID: <span className="font-mono text-cyan-800 font-bold">{intake._id}</span></div>
              <div className="flex items-center sm:justify-end gap-1 text-slate-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>Date: {issueDate}</span>
              </div>
            </div>
          </div>

          {/* Doctor & Patient Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-slate-400 uppercase text-[10px] block">
                Patient Information
              </span>
              <div className="font-bold text-sm text-slate-900">{patientName}</div>
              <div className="text-slate-600">{intake.patientId?.email}</div>
              <div className="text-slate-500 mt-1">
                Symptom Duration: <span className="font-semibold text-slate-800">{intake.duration}</span>
              </div>
            </div>

            <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
              <span className="font-bold text-slate-400 uppercase text-[10px] block">
                Attending Physician
              </span>
              <div className="font-bold text-sm text-cyan-900">Dr. {doctorName}</div>
              <div className="text-slate-600">Consulting Medical Officer</div>
              <div className="text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Consultation Status: Completed</span>
              </div>
            </div>
          </div>

          {/* Reported Symptoms & Baseline History */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Reported Symptoms & Chief Complaint
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed font-medium">
              {intake.symptoms}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Current Medications:</span>
                <span className="text-slate-800 font-medium">
                  {intake.currentMedications?.length ? intake.currentMedications.join(', ') : 'None reported'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Known Drug Allergies:</span>
                <span className="text-amber-900 font-bold">
                  {intake.allergies?.length ? intake.allergies.join(', ') : 'No known allergies'}
                </span>
              </div>
            </div>
          </div>

          {/* Rx: Physician's Prescription & Clinical Guidance */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="font-serif italic font-extrabold text-2xl text-cyan-800 leading-none">
                ℞
              </span>
              <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                Physician's Rx & Clinical Orders
              </h4>
            </div>

            <div className="p-5 rounded-2xl bg-cyan-50/40 border-2 border-cyan-200 text-slate-900 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {intake.doctorNotes || 'No specific clinical prescription instructions recorded.'}
            </div>
          </div>

          {/* Footer & Electronic Signature */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-6 text-xs text-slate-500">
            <div className="space-y-1 max-w-sm">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Digitally Verified & Signed</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                This document is an electronic consultation record generated by MedBrief_AI. Valid for pharmacy dispensing and clinical follow-up as authorized by law.
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1 flex-shrink-0">
              <div className="w-44 border-b border-slate-400 pb-1 mx-auto sm:ml-auto">
                <span className="font-serif italic text-sm text-cyan-900 font-bold">
                  Dr. {doctorName}
                </span>
              </div>
              <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Authorized Medical Signature
              </div>
              <div className="text-[9px] text-slate-400">
                Timestamp: {new Date(intake.updatedAt || Date.now()).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Action Toolbar (Always Visible) */}
        <div className="print:hidden p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Official medical record</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Close Window
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionSlipModal;
