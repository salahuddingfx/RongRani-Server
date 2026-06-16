const express = require('express');
const {
    getChatResponse,
    getProductRecommendations,
    analyzeFeedback,
    generateProductDescription,
    generateMarketingContent,
    analyzeSalesData,
} = require('../controllers/ai.controller');
const { auth, authorize } = require('../middlewares/auth.middleware');
const { apiLimiter } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

// Rate limiting for AI chat
const aiLimiter = apiLimiter;

router.post('/chat', aiLimiter, getChatResponse);
router.post('/recommendations', auth, getProductRecommendations);

// Admin only routes
router.post('/analyze-feedback', auth, authorize(['admin', 'super_admin']), analyzeFeedback);
router.post('/generate-description', auth, authorize(['admin', 'super_admin']), generateProductDescription);
router.post('/generate-content', auth, authorize(['admin', 'super_admin']), generateMarketingContent);
router.post('/analyze-sales', auth, authorize(['admin', 'super_admin']), analyzeSalesData);

module.exports = router;