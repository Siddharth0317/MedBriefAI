const express = require('express');
const { generateSummary, chatWithIntake } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

// All AI briefing and RAG chat routes require authentication
router.use(protect);

router.post('/:id/generate-summary', generateSummary);
router.post('/:id/chat', chatWithIntake);

module.exports = router;
