const mongoose = require('mongoose');

const AISummarySchema = new mongoose.Schema(
  {
    chiefComplaint: { type: String, default: '' },
    historyOfPresentIllness: { type: String, default: '' },
    flaggedRisks: [{ type: String }],
    extractedVitals: { type: mongoose.Schema.Types.Mixed, default: {} },
    suggestedActions: [{ type: String }],
    completedActions: [{ type: String }],
    generatedAt: { type: Date },
  },
  { _id: false }
);

const PatientIntakeSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    assignedDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    symptoms: {
      type: String,
      required: [true, 'Symptoms description is required'],
      trim: true,
    },
    duration: {
      type: String,
      required: [true, 'Symptom duration is required'],
      trim: true,
    },
    currentMedications: [
      {
        type: String,
        trim: true,
      },
    ],
    allergies: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: {
        values: ['Submitted', 'Under_Review', 'Briefing_Ready', 'Completed'],
        message: '{VALUE} is not a valid intake status',
      },
      default: 'Submitted',
      index: true,
    },
    aiSummary: {
      type: AISummarySchema,
      default: () => ({}),
    },
    doctorNotes: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

module.exports = mongoose.model('PatientIntake', PatientIntakeSchema);
