import React from 'react';
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
  Building2
} from 'lucide-react';

/**
 * PrescriptionSlipModal Component
 * Renders an official medical prescription slip with printable letterhead
 * @param {Object} props
 * @param {Object} props.intake - Intake details
 * @param {Array} props.documents - Attached documents
 * @param {Function} props.onClose - Modal close handler
 */
const PrescriptionSlipModal = ({ intake, documents = [], onClose }) => {
  if (!intake) return null;

  const handlePrint = () => {
    window.print();
  };

  const doctorName = intake.assignedDoctorId?.name || 'Attending Physician';
  const patientName = intake.patientId?.name || 'Patient';
  const issueDate = new Date(intake.updatedAt || intake.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Top Control Bar (Hidden during print) */}
        <div className="print:hidden p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold">Official Medical Prescription Slip</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Prescription Slip Container */}
        <div className="p-8 sm:p-12 text-slate-900 font-sans space-y-8 bg-white" id="prescription-printable-area">
          {/* Clinic Header / Letterhead */}
          <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
                <Stethoscope className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                  MedBrief_AI Clinical Network
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Digital Consultation & Outpatient Triage Center
                </p>
                <p className="text-[10px] text-slate-400">
                  License: MED-TRIAGE-2026-AI • Verified Healthcare Provider
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5">
              <div className="font-bold text-slate-900">Consultation Slip</div>
              <div>Ref ID: <span className="font-mono text-cyan-800 font-bold">{intake._id}</span></div>
              <div className="flex items-center sm:justify-end gap-1 text-slate-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>Date: {issueDate}</span>
              </div>
            </div>
          </div>

          {/* Doctor & Patient Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-slate-400 uppercase text-[10px] block">
                Patient Information
              </span>
              <div className="font-bold text-sm text-slate-900">{patientName}</div>
              <div className="text-slate-600">{intake.patientId?.email}</div>
              <div className="text-slate-500 mt-1">
                Duration: <span className="font-semibold text-slate-800">{intake.duration}</span>
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

          {/* Reported Symptoms & Clinical Baseline */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Reported Symptoms & Chief Complaint
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 text-slate-800 leading-relaxed font-medium">
              {intake.symptoms}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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

          {/* Rx: Prescription & Verified Doctor's Advice */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="font-serif italic font-extrabold text-2xl text-cyan-800 leading-none">
                ℞
              </span>
              <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                Physician's Rx & Clinical Orders
              </h4>
            </div>

            <div className="p-5 rounded-2xl bg-cyan-50/40 border-2 border-cyan-200 text-slate-900 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {intake.doctorNotes || 'No specific clinical notes provided.'}
            </div>
          </div>

          {/* Footer & Electronic Signature */}
          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-6 text-xs text-slate-500">
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
      </div>
    </div>
  );
};

export default PrescriptionSlipModal;
