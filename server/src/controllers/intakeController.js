const { validationResult } = require('express-validator');
const { extractTextFromPDF } = require('../services/pdfExtractionService');
const PatientIntake = require('../models/PatientIntake');
const MedicalDocument = require('../models/MedicalDocument');
const ragService = require('../services/ragService');

/**
 * @desc    Submit symptom questionnaire & create new patient intake
 * @route   POST /api/intake
 * @access  Private (Patient only or Doctor on behalf)
 */
const createIntake = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => ({ field: err.path, message: err.msg })),
      });
    }

    const { symptoms, duration, currentMedications, allergies } = req.body;

    const intake = await PatientIntake.create({
      patientId: req.user._id,
      symptoms,
      duration,
      currentMedications: Array.isArray(currentMedications)
        ? currentMedications.filter(Boolean)
        : currentMedications
        ? [currentMedications]
        : [],
      allergies: Array.isArray(allergies)
        ? allergies.filter(Boolean)
        : allergies
        ? [allergies]
        : [],
      status: 'Submitted',
    });

    return res.status(201).json({
      success: true,
      message: 'Clinical intake submitted successfully.',
      intake,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List intakes (Patients see their own; Doctors see triage queue)
 * @route   GET /api/intake
 * @access  Private
 */
const getIntakes = async (req, res, next) => {
  try {
    let query = {};
    const { status } = req.query;

    // Strict role isolation: Non-doctors can only ever see their own records
    if (req.user.role !== 'doctor') {
      query.patientId = req.user._id;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const intakes = await PatientIntake.find(query)
      .populate('patientId', 'name email role')
      .populate('assignedDoctorId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    // Attach document counts to each intake
    const intakeIds = intakes.map((i) => i._id);
    const documents = await MedicalDocument.find(
      { intakeId: { $in: intakeIds } },
      'intakeId fileName fileSize pageCount createdAt'
    ).lean();

    const docMap = {};
    documents.forEach((doc) => {
      const id = doc.intakeId.toString();
      if (!docMap[id]) docMap[id] = [];
      docMap[id].push(doc);
    });

    const enrichedIntakes = intakes.map((intake) => ({
      ...intake,
      documents: docMap[intake._id.toString()] || [],
      documentCount: (docMap[intake._id.toString()] || []).length,
    }));

    return res.status(200).json({
      success: true,
      count: enrichedIntakes.length,
      intakes: enrichedIntakes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Retrieve full intake details and attached document list
 * @route   GET /api/intake/:id
 * @access  Private
 */
const getIntakeById = async (req, res, next) => {
  try {
    const intake = await PatientIntake.findById(req.params.id)
      .populate('patientId', 'name email role')
      .populate('assignedDoctorId', 'name email role');

    if (!intake) {
      return res.status(404).json({
        success: false,
        message: 'Patient intake record not found.',
      });
    }

    // Role access authorization check: Non-doctors can only view their own intake
    if (
      req.user.role !== 'doctor' &&
      intake.patientId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You can only view your own clinical records.',
      });
    }

    const documents = await MedicalDocument.find({ intakeId: intake._id })
      .select('-chunks.embedding')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      intake,
      documents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update intake status and doctor notes
 * @route   PUT /api/intake/:id
 * @access  Private (Doctors only for status/notes; Patients can edit before review)
 */
const updateIntake = async (req, res, next) => {
  try {
    const intake = await PatientIntake.findById(req.params.id);

    if (!intake) {
      return res.status(404).json({
        success: false,
        message: 'Patient intake record not found.',
      });
    }

    // Role-based update permission
    if (req.user.role === 'patient') {
      if (intake.patientId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to edit this intake.',
        });
      }
      if (intake.status !== 'Submitted') {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify an intake that is already under doctor review or completed.',
        });
      }
      // Allow patient to edit symptoms/medications
      if (req.body.symptoms) intake.symptoms = req.body.symptoms;
      if (req.body.duration) intake.duration = req.body.duration;
      if (req.body.currentMedications) intake.currentMedications = req.body.currentMedications;
      if (req.body.allergies) intake.allergies = req.body.allergies;
    } else if (req.user.role === 'doctor') {
      // Doctor can update status, clinical notes, and action checklist
      if (req.body.status) intake.status = req.body.status;
      if (req.body.doctorNotes !== undefined) intake.doctorNotes = req.body.doctorNotes;
      if (req.body.completedActions !== undefined) {
        if (!intake.aiSummary) intake.aiSummary = {};
        intake.aiSummary.completedActions = req.body.completedActions;
      }
      if (req.body.assignedDoctorId) intake.assignedDoctorId = req.body.assignedDoctorId;
      else if (!intake.assignedDoctorId) intake.assignedDoctorId = req.user._id;
    }

    intake.updatedAt = Date.now();
    await intake.save();

    await intake.populate('patientId', 'name email role');
    await intake.populate('assignedDoctorId', 'name email role');

    return res.status(200).json({
      success: true,
      message: 'Intake updated successfully.',
      intake,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete intake and cascade delete associated vector chunks / documents
 * @route   DELETE /api/intake/:id
 * @access  Private
 */
const deleteIntake = async (req, res, next) => {
  try {
    const intake = await PatientIntake.findById(req.params.id);

    if (!intake) {
      return res.status(404).json({
        success: false,
        message: 'Patient intake record not found.',
      });
    }

    // Verify ownership
    if (
      req.user.role === 'patient' &&
      intake.patientId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You can only delete your own intake records.',
      });
    }

    // Cascade delete all associated documents
    await MedicalDocument.deleteMany({ intakeId: intake._id });
    await PatientIntake.findByIdAndDelete(intake._id);

    return res.status(200).json({
      success: true,
      message: 'Intake and associated clinical documents deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload PDF documents, extract text via pdf-parse, and store MedicalDocument records
 * @route   POST /api/intake/:id/upload
 * @access  Private
 */
const uploadDocuments = async (req, res, next) => {
  try {
    const intake = await PatientIntake.findById(req.params.id);

    if (!intake) {
      return res.status(404).json({
        success: false,
        message: 'Patient intake record not found.',
      });
    }

    // Verify ownership
    if (
      req.user.role === 'patient' &&
      intake.patientId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to upload documents to this intake.',
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one PDF document to upload.',
      });
    }

    const savedDocuments = [];

    for (const file of req.files) {
      const { extractedText, pageCount } = await extractTextFromPDF(
        file.buffer,
        file.originalname
      );

      const medicalDoc = await MedicalDocument.create({
        intakeId: intake._id,
        fileName: file.originalname,
        fileUrl: `/uploads/${intake._id}_${Date.now()}_${encodeURIComponent(file.originalname)}`,
        extractedText: extractedText || '[Empty document content]',
        fileSize: file.size,
        pageCount,
        chunks: [],
      });

      // Automatically generate vector chunks and embeddings (Phase 3)
      let generatedChunks = [];
      try {
        generatedChunks = await ragService.processAndStoreDocumentChunks(medicalDoc._id);
      } catch (chunkError) {
        console.warn(`Vector chunking warning for ${file.originalname}: ${chunkError.message}`);
      }

      savedDocuments.push({
        _id: medicalDoc._id,
        fileName: medicalDoc.fileName,
        fileUrl: medicalDoc.fileUrl,
        fileSize: medicalDoc.fileSize,
        pageCount: medicalDoc.pageCount,
        chunkCount: generatedChunks.length,
        extractedTextPreview:
          medicalDoc.extractedText.slice(0, 200) +
          (medicalDoc.extractedText.length > 200 ? '...' : ''),
        createdAt: medicalDoc.createdAt,
      });
    }

    return res.status(201).json({
      success: true,
      message: `Successfully processed, extracted text, and vector-embedded ${savedDocuments.length} PDF document(s).`,
      documents: savedDocuments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Vector similarity search across an intake's medical document chunks
 * @route   POST /api/intake/:id/query-chunks
 * @access  Private
 */
const querySimilarChunks = async (req, res, next) => {
  try {
    const { query, topK } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search query string is required.',
      });
    }

    const intake = await PatientIntake.findById(req.params.id);
    if (!intake) {
      return res.status(404).json({
        success: false,
        message: 'Patient intake record not found.',
      });
    }

    // Role check: patient can only search own; doctor can search any
    if (
      req.user.role === 'patient' &&
      intake.patientId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to search this clinical record.',
      });
    }

    const results = await ragService.retrieveTopKChunks(
      intake._id,
      query.trim(),
      parseInt(topK, 10) || 5
    );

    return res.status(200).json({
      success: true,
      query: query.trim(),
      count: results.length,
      results,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIntake,
  getIntakes,
  getIntakeById,
  updateIntake,
  deleteIntake,
  uploadDocuments,
  querySimilarChunks,
};
