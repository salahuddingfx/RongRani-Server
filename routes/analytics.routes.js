const express = require('express');
const router = express.Router();
const {
    getDashboardAnalytics,
    getRealtimeStats
} = require('../controllers/analytics.controller');
const { auth } = require('../middlewares/auth.middleware');
const admin = require('../middlewares/admin.middleware');

// All routes require admin authentication
router.get('/dashboard', auth, admin, getDashboardAnalytics);
router.get('/realtime', auth, admin, getRealtimeStats);

module.exports = router;
