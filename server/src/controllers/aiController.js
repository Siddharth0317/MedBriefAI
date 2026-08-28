const PatientIntake = require('../models/PatientIntake');
const MedicalDocument = require('../models/MedicalDocument');
const ragService = require('../services/ragService');
const { generateSOAPSummary, generateRAGChatResponse } = require('../services/aiSummaryService');

/**
 * @desc    Trigger AI extraction & synthesis to generate structured SOAP briefing
 * @route   POST /api/intake/:id/generate-summary
 * @access  Private
 */
const generateSummary = async (req, res, next) => {
  try {
    const intake = await PatientIntake.findById(req.params.id);
    if (!intake) {
      return res.status(404).json({
        success: false,
        message: 'Patient intake record not found.',
      });
    }

    // Role verification
    if (
      req.user.role === 'patient' &&
      intake.patientId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to generate briefing for this intake.',
      });
    }

    // Fetch associated documents
    const documents = await MedicalDocument.find({ intakeId: intake._id });

    // Generate SOAP summary
    const aiSummary = await generateSOAPSummary(intake, documents);

    intake.aiSummary = aiSummary;
    if (intake.status === 'Submitted' || intake.status === 'Under_Review') {
      intake.status = 'Briefing_Ready';
    }
    intake.updatedAt = Date.now();
    await intake.save();

    return res.status(200).json({
      success: true,
      message: 'AI SOAP clinical briefing generated successfully.',
      status: intake.status,
      aiSummary: intake.aiSummary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    RAG Chat - Doctor queries patient records with citation-backed AI answers
 * @route   POST /api/intake/:id/chat
 * @access  Private
 */
const chatWithIntake = async (req, res, next) => {
  try {
    const { message, query } = req.body;
    const userQuery = (message || query || '').trim();

    if (!userQuery) {
      return res.status(400).json({
        success: false,
        message: 'Query message is required for clinical chat assistant.',
      });
    }

    const intake = await PatientIntake.findById(req.params.id);
    if (!intake) {
      return res.status(404).json({
        success: false,
        message: 'Patient intake record not found.',
      });
    }

    // Role verification
    if (
      req.user.role === 'patient' &&
      intake.patientId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to access chat for this clinical record.',
      });
    }

    // 1. Vector similarity search for top-k document chunks
    const relevantChunks = await ragService.retrieveTopKChunks(intake._id, userQuery, 4);

    // 2. Synthesize grounded answer
    const response = await generateRAGChatResponse(intake, userQuery, relevantChunks);

    return res.status(200).json({
      success: true,
      query: userQuery,
      answer: response.answer,
      citations: response.citations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateSummary,
  chatWithIntake,
};
