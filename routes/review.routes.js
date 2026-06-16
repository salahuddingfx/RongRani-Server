const express = require('express');
const { getPublicReviews } = require('../controllers/review.controller');

const router = express.Router();

// Public routes
router.get('/all', getPublicReviews);

module.exports = router;
