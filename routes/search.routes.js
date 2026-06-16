const express = require('express');
const router = express.Router();
const {
    getSearchSuggestions,
    getTrendingSearches
} = require('../controllers/search.controller');

// Public routes
router.get('/suggestions', getSearchSuggestions);
router.get('/trending', getTrendingSearches);

module.exports = router;
