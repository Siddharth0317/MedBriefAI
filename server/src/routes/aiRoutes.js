const express = require('express');
const { generateSummary, chatWithIntake } = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

// All AI clinical decision support tools require doctor authentication
router.use(protect);
router.use(authorize('doctor'));

router.post('/:id/generate-summary', generateSummary);
router.post('/:id/chat', chatWithIntake);

module.exports = router;
