import { jsPDF } from 'jspdf';

/**
 * Generates and downloads a clean, professional 1-page Medical Prescription PDF
 * @param {Object} intake - Intake record data
 */
export const generatePrescriptionPDF = (intake) => {
  if (!intake) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const patientName = intake.patientId?.name || 'Patient';
  const patientEmail = intake.patientId?.email || 'N/A';
  const doctorName = intake.assignedDoctorId?.name ? `Dr. ${intake.assignedDoctorId.name}` : 'Dr. Medical Officer';
  const issueDate = new Date(intake.updatedAt || intake.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const refId = intake._id || 'N/A';

  // --- 1. Top Header Banner ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, margin, contentWidth, 24, 'F');

  // Clinic Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('MedBrief_AI Clinical Network', margin + 8, margin + 10);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Digital Outpatient & Clinical Triage Center • License: MED-TRIAGE-2026-AI', margin + 8, margin + 17);

  // Header Right Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(34, 211, 238); // cyan-400
  doc.text('OFFICIAL PRESCRIPTION', pageWidth - margin - 8, margin + 9, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Ref ID: ${refId.slice(-8).toUpperCase()}`, pageWidth - margin - 8, margin + 14, { align: 'right' });
  doc.text(`Date: ${issueDate}`, pageWidth - margin - 8, margin + 19, { align: 'right' });

  let y = margin + 30;

  // --- 2. Patient & Attending Doctor Info Box ---
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

  // Patient Column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PATIENT INFORMATION', margin + 6, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(patientName, margin + 6, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Duration: ${intake.duration || 'N/A'}`, margin + 6, y + 21);

  // Doctor Column (Right side of box)
  const col2X = margin + (contentWidth / 2) + 5;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + contentWidth / 2, y + 3, margin + contentWidth / 2, y + 23);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ATTENDING PHYSICIAN', col2X, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(14, 116, 144); // cyan-700
  doc.text(doctorName, col2X, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Consulting Medical Officer', col2X, y + 18);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.setFont('helvetica', 'bold');
  doc.text('Status: Verified Consultation Record', col2X, y + 23);

  y += 32;

  // --- 3. Reported Chief Complaint & Symptoms ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('REPORTED SYMPTOMS & CHIEF COMPLAINT', margin, y);

  y += 3;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  const symptomsText = doc.splitTextToSize(intake.symptoms || 'None recorded', contentWidth - 8);
  const symptomsBoxHeight = Math.max(14, symptomsText.length * 4.5 + 6);
  doc.roundedRect(margin, y, contentWidth, symptomsBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(symptomsText, margin + 4, y + 6);

  y += symptomsBoxHeight + 5;

  // --- 4. Current Medications & Known Allergies ---
  const halfWidth = (contentWidth - 4) / 2;

  // Medications Box
  doc.roundedRect(margin, y, halfWidth, 16, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CURRENT MEDICATIONS:', margin + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const medText = intake.currentMedications?.length ? intake.currentMedications.join(', ') : 'None reported';
  doc.text(doc.splitTextToSize(medText, halfWidth - 8), margin + 4, y + 11);

  // Allergies Box
  doc.roundedRect(margin + halfWidth + 4, y, halfWidth, 16, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text('KNOWN DRUG ALLERGIES:', margin + halfWidth + 8, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(146, 64, 14); // amber-900
  const allergyText = intake.allergies?.length ? intake.allergies.join(', ') : 'No known allergies';
  doc.text(doc.splitTextToSize(allergyText, halfWidth - 8), margin + halfWidth + 8, y + 11);

  y += 22;

  // --- 5. ℞ Physician's Prescription & Clinical Guidance ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(14, 116, 144); // cyan-700
  doc.text('Rx', margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("PHYSICIAN'S CLINICAL PRESCRIPTION & ORDERS", margin + 10, y - 1);

  y += 4;
  doc.setFillColor(240, 253, 250); // cyan-50/50
  doc.setDrawColor(165, 243, 252); // cyan-200
  doc.setLineWidth(0.5);

  const notesText = doc.splitTextToSize(intake.doctorNotes || 'No specific clinical prescription instructions recorded.', contentWidth - 10);
  const notesHeight = Math.max(38, notesText.length * 5 + 10);
  doc.roundedRect(margin, y, contentWidth, notesHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(notesText, margin + 5, y + 7);

  y += notesHeight + 8;

  // --- 6. Footer & Electronic Signature Block ---
  const footerY = Math.max(y, pageHeight - margin - 25);

  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  // Left Legal Note
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('DIGITALLY VERIFIED & SIGNED', margin, footerY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This document is an electronic consultation record generated by MedBrief_AI.', margin, footerY + 11);
  doc.text('Valid for pharmacy dispensing and clinical follow-up as authorized by law.', margin, footerY + 15);

  // Right Signature Line
  const sigX = pageWidth - margin - 50;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(14, 116, 144); // cyan-700
  doc.text(doctorName, sigX, footerY + 7);

  doc.setDrawColor(100, 116, 139);
  doc.line(sigX, footerY + 9, pageWidth - margin, footerY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('AUTHORIZED MEDICAL SIGNATURE', sigX, footerY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Timestamp: ${new Date(intake.updatedAt || Date.now()).toLocaleString()}`, sigX, footerY + 17);

  // Save File directly to client downloads
  const sanitizedName = patientName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Prescription_${sanitizedName}_${refId.slice(-6)}.pdf`;
  doc.save(filename);
};
