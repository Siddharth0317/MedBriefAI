import React, { useState, useEffect } from 'react';
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
  Check,
  Loader2
} from 'lucide-react';
import { generatePrescriptionPDF } from '../utils/prescriptionPdfGenerator';

/**
 * PrescriptionSlipModal Component
 * Renders an official medical prescription slip with printable letterhead,
 * direct vector PDF generation via jsPDF, and isolated 1-page browser print.
 * @param {Object} props
 * @param {Object} props.intake - Intake details
 * @param {Array} [props.documents=[]] - Attached documents
 * @param {Function} props.onClose - Modal close handler
 */
const PrescriptionSlipModal = ({ intake, documents = [], onClose }) => {
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

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

  if (!intake) return null;

  const doctorName = intake.assignedDoctorId?.name ? `Dr. ${intake.assignedDoctorId.name}` : 'Attending Physician';
  const patientName = intake.patientId?.name || 'Patient';
  const issueDate = new Date(intake.updatedAt || intake.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Direct Vector PDF Download via jsPDF (Instant, Never Blank)
  const handleDownloadPDF = () => {
    setIsDownloadingPDF(true);
    try {
      generatePrescriptionPDF(intake);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF. Please try the Print button.');
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // Dedicated Clean 1-Page Iframe Print (No modal bleed, No blank pages)
  const handlePrint = () => {
    const element = document.getElementById('prescription-printable-area');
    if (!element) {
      window.print();
      return;
    }

    try {
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = 'none';
      document.body.appendChild(printIframe);

      const iframeDoc = printIframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Prescription_${patientName.replace(/\s+/g, '_')}_${intake._id.slice(-6)}</title>
            <style>
              @page { size: A4 portrait; margin: 15mm 15mm; }
              body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                margin: 0; 
                padding: 0;
                color: #0f172a; 
                background: #ffffff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              * { box-sizing: border-box; }
              .printable-card {
                width: 100%;
                max-width: 100%;
                margin: 0 auto;
              }
            </style>
            <!-- Include Tailwind CDN in print iframe to preserve styles -->
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-white p-4">
            <div class="printable-card">
              ${element.innerHTML}
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      setTimeout(() => {
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
        setTimeout(() => {
          if (document.body.contains(printIframe)) {
            document.body.removeChild(printIframe);
          }
        }, 2000);
      }, 500);
    } catch (e) {
      console.warn('Iframe print fallback to window.print', e);
      window.print();
    }
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
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0 z-10">
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
              onClick={handleDownloadPDF}
              disabled={isDownloadingPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/30 transition cursor-pointer disabled:opacity-50"
              title="Download PDF directly to your device"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>PDF Downloaded!</span>
                </>
              ) : isDownloadingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Open browser print preview (1 Page)"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print Slip</span>
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
        <div className="overflow-y-auto flex-1 p-6 sm:p-10 text-slate-900 font-sans space-y-6 bg-white" id="prescription-printable-area">
          
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
              <div className="font-bold text-slate-900 text-sm">Medical Prescription Slip</div>
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
              <div className="font-bold text-sm text-cyan-900">{doctorName}</div>
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
          <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-6 text-xs text-slate-500">
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
                  {doctorName}
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
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Official medical consultation record</span>
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
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloadingPDF}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>PDF Downloaded!</span>
                </>
              ) : isDownloadingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF File</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionSlipModal;
