const express = require('express');
const { body } = require('express-validator');
const {
  createIntake,
  getIntakes,
  getIntakeById,
  updateIntake,
  deleteIntake,
  uploadDocuments,
  querySimilarChunks,
} = require('../controllers/intakeController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Validation rules for submitting new intake
const intakeValidation = [
  body('symptoms')
    .trim()
    .notEmpty()
    .withMessage('Chief complaint and symptoms description is required'),
  body('duration')
    .trim()
    .notEmpty()
    .withMessage('Symptom duration is required'),
  body('currentMedications')
    .optional(),
  body('allergies')
    .optional(),
];

// All intake routes require authentication
router.use(protect);

router
  .route('/')
  .post(intakeValidation, createIntake)
  .get(getIntakes);

router
  .route('/:id')
  .get(getIntakeById)
  .put(updateIntake)
  .delete(deleteIntake);

// Upload multi-PDF route (auto chunks & embeds)
router.post(
  '/:id/upload',
  upload.array('documents', 5),
  uploadDocuments
);

// Vector search / RAG retrieval query route
router.post(
  '/:id/query-chunks',
  querySimilarChunks
);

module.exports = router;
