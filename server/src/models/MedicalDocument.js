const mongoose = require('mongoose');

const DocumentChunkSchema = new mongoose.Schema(
  {
    chunkText: {
      type: String,
      required: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    embedding: [
      {
        type: Number,
      },
    ],
  },
  { _id: false }
);

const MedicalDocumentSchema = new mongoose.Schema({
  intakeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientIntake',
    required: [true, 'Intake ID is required'],
    index: true,
  },
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true,
  },
  fileUrl: {
    type: String,
    required: [true, 'File URL is required'],
    trim: true,
  },
  extractedText: {
    type: String,
    required: [true, 'Extracted text is required'],
  },
  chunks: [DocumentChunkSchema],
  fileSize: {
    type: Number,
  },
  pageCount: {
    type: Number,
    default: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('MedicalDocument', MedicalDocumentSchema);
