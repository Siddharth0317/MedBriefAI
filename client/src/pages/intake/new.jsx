import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import DocumentDropzone from '../../components/DocumentDropzone';
import api from '../../services/api';
import { 
  Activity, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  FileText, 
  Pill, 
  AlertTriangle, 
  Clock, 
  Loader2, 
  Plus, 
  X, 
  Stethoscope 
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Symptoms & Complaint', desc: 'Chief health concerns' },
  { id: 2, title: 'History & Meds', desc: 'Durations & allergies' },
  { id: 3, title: 'Upload Records', desc: 'PDF lab & clinical charts' },
  { id: 4, title: 'Review & Submit', desc: 'Verify intake details' },
];

export default function NewIntake() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    symptoms: '',
    duration: '',
    currentMedications: [],
    allergies: [],
  });

  // Auxiliary inputs for tags/chips
  const [medInput, setMedInput] = useState('');
  const [allergyInput, setAllergyInput] = useState('');

  // Attached PDF files
  const [attachedFiles, setAttachedFiles] = useState([]);

  // UI state
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);

  // Tag helpers
  const handleAddMedication = (e) => {
    if (e) e.preventDefault();
    if (medInput.trim() && !formData.currentMedications.includes(medInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        currentMedications: [...prev.currentMedications, medInput.trim()],
      }));
      setMedInput('');
    }
  };

  const handleRemoveMedication = (medToRemove) => {
    setFormData((prev) => ({
      ...prev,
      currentMedications: prev.currentMedications.filter((m) => m !== medToRemove),
    }));
  };

  const handleAddAllergy = (e) => {
    if (e) e.preventDefault();
    if (allergyInput.trim() && !formData.allergies.includes(allergyInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        allergies: [...prev.allergies, allergyInput.trim()],
      }));
      setAllergyInput('');
    }
  };

  const handleRemoveAllergy = (allergyToRemove) => {
    setFormData((prev) => ({
      ...prev,
      allergies: prev.allergies.filter((a) => a !== allergyToRemove),
    }));
  };

  // Step Validation
  const validateStep = (step) => {
    const errors = {};
    if (step === 1) {
      if (!formData.symptoms.trim()) {
        errors.symptoms = 'Please describe your symptoms and chief complaints.';
      } else if (formData.symptoms.trim().length < 10) {
        errors.symptoms = 'Please provide a bit more detail about your symptoms (min 10 characters).';
      }
    } else if (step === 2) {
      if (!formData.duration.trim()) {
        errors.duration = 'Please specify how long you have experienced these symptoms (e.g. "3 days", "2 weeks").';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Submission handler
  const handleSubmitIntake = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      // 1. Create PatientIntake record
      const intakeRes = await api.post('/api/intake', {
        symptoms: formData.symptoms,
        duration: formData.duration,
        currentMedications: formData.currentMedications,
        allergies: formData.allergies,
      });

      const intakeId = intakeRes.data.intake._id;

      // 2. Upload PDF files if any were attached
      if (attachedFiles.length > 0) {
        const uploadData = new FormData();
        attachedFiles.forEach((file) => {
          uploadData.append('documents', file);
        });

        await api.post(`/api/intake/${intakeId}/upload`, uploadData);
      }

      // 3. Redirect to dashboard
      router.push('/dashboard?submitted=true');
    } catch (err) {
      console.error('Submission error:', err);
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        'Failed to submit intake. Please review your details and try again.';
      setSubmissionError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/20 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-cyan-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white shadow-sm">
                <Activity className="w-5 h-5" />
              </div>
              <span className="font-bold text-base text-slate-900">
                MedBrief<span className="text-cyan-600">.AI</span> Intake
              </span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="mb-8 bg-white/80 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
            <div className="grid grid-cols-4 gap-2 sm:gap-4 relative">
              {STEPS.map((step) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;

                return (
                  <div key={step.id} className="flex flex-col items-center text-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition mb-1.5 ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-cyan-600 text-white ring-4 ring-cyan-100 shadow-md shadow-cyan-600/20'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                    </div>
                    <div className="hidden sm:block text-xs font-semibold text-slate-800">
                      {step.title}
                    </div>
                    <div className="hidden sm:block text-[10px] text-slate-400">
                      {step.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl p-6 sm:p-10 animate-fade-in">
            {submissionError && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 animate-fade-in">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                <div className="text-sm font-medium">{submissionError}</div>
              </div>
            )}

            {/* STEP 1: Chief Complaint & Symptoms */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    What symptoms are you currently experiencing?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Describe your primary health complaint, pain locations, fever, or noticeable physical changes.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                    Chief Complaint & Symptoms *
                  </label>
                  <textarea
                    rows={6}
                    value={formData.symptoms}
                    onChange={(e) => {
                      setFormData({ ...formData, symptoms: e.target.value });
                      if (formErrors.symptoms) setFormErrors({ ...formErrors, symptoms: null });
                    }}
                    placeholder="e.g. Experiencing sharp chest tightness, mild fever since Tuesday, and shortness of breath when climbing stairs..."
                    className={`w-full p-4 rounded-xl border bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:bg-white transition ${
                      formErrors.symptoms
                        ? 'border-red-300 focus:ring-red-400'
                        : 'border-slate-300 focus:ring-cyan-500 focus:border-cyan-500'
                    }`}
                  />
                  {formErrors.symptoms && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {formErrors.symptoms}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Duration, Medications, Allergies */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Duration & Clinical History
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Help clinicians understand the timeline and existing medications.
                  </p>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Symptom Duration *
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={formData.duration}
                      onChange={(e) => {
                        setFormData({ ...formData, duration: e.target.value });
                        if (formErrors.duration) setFormErrors({ ...formErrors, duration: null });
                      }}
                      placeholder="e.g. 4 days, 2 weeks, ongoing for 1 month"
                      className={`block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:bg-white transition ${
                        formErrors.duration
                          ? 'border-red-300 focus:ring-red-400'
                          : 'border-slate-300 focus:ring-cyan-500 focus:border-cyan-500'
                      }`}
                    />
                  </div>
                  {formErrors.duration && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium">{formErrors.duration}</p>
                  )}
                </div>

                {/* Current Medications */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Current Medications (Optional)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Pill className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={medInput}
                        onChange={(e) => setMedInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMedication(e)}
                        placeholder="e.g. Metformin 500mg, Lisinopril 10mg"
                        className="block w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMedication}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>

                  {formData.currentMedications.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {formData.currentMedications.map((med, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-medium"
                        >
                          <Pill className="w-3 h-3 text-cyan-600" />
                          {med}
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(med)}
                            className="text-cyan-600 hover:text-red-600 transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Allergies */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Known Allergies (Optional)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={allergyInput}
                        onChange={(e) => setAllergyInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddAllergy(e)}
                        placeholder="e.g. Penicillin, Sulfa, Peanuts"
                        className="block w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddAllergy}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>

                  {formData.allergies.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {formData.allergies.map((allergy, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          {allergy}
                          <button
                            type="button"
                            onClick={() => handleRemoveAllergy(allergy)}
                            className="text-amber-600 hover:text-red-600 transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Medical Documents Upload */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Upload Lab Reports & Medical Records
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Attach past discharge summaries, bloodwork, or imaging PDFs. Our pipeline extracts clinical text automatically.
                  </p>
                </div>

                <DocumentDropzone
                  files={attachedFiles}
                  onFilesChange={setAttachedFiles}
                  maxFiles={5}
                  maxSizeMB={10}
                />
              </div>
            )}

            {/* STEP 4: Review & Submit */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Review Your Clinical Intake
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Please verify the clinical summary details before submitting for doctor review.
                  </p>
                </div>

                <div className="space-y-4 rounded-xl bg-slate-50 p-5 border border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Chief Complaint & Symptoms:
                    </span>
                    <p className="text-sm text-slate-900 whitespace-pre-wrap bg-white p-3 rounded-lg border border-slate-200">
                      {formData.symptoms}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Duration:
                      </span>
                      <p className="text-sm font-semibold text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200">
                        {formData.duration}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Attached Documents:
                      </span>
                      <p className="text-sm font-semibold text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200">
                        {attachedFiles.length > 0
                          ? `${attachedFiles.length} PDF file(s) attached`
                          : 'No documents attached'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Current Medications:
                      </span>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 min-h-[40px] flex flex-wrap gap-1.5">
                        {formData.currentMedications.length > 0 ? (
                          formData.currentMedications.map((m, i) => (
                            <span key={i} className="px-2 py-0.5 bg-cyan-50 text-cyan-800 rounded font-medium text-[11px]">
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">None reported</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Known Allergies:
                      </span>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 min-h-[40px] flex flex-wrap gap-1.5">
                        {formData.allergies.length > 0 ? (
                          formData.allergies.map((a, i) => (
                            <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-medium text-[11px]">
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
              </div>
            )}

            {/* Step Navigation Controls */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </button>
              ) : (
                <div></div>
              )}

              {currentStep < STEPS.length ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition flex items-center gap-1.5"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitIntake}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 transition flex items-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading & Processing Records...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Submit Clinical Intake</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
