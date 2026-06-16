const express = require('express');
const { auth } = require('../middlewares/auth.middleware');
const {
    initPayment,
    bkashCallback,
    sslSuccess
} = require('../controllers/payment.controller');

const router = express.Router();

/**
 * @desc    Initialize a payment (bKash, Nagad, SSL)
 * @route   POST /api/payment/init
 */
router.post('/init', auth, initPayment);

/**
 * @desc    bKash Callback (Backend to Backend)
 * @route   GET /api/payment/bkash/callback
 */
router.get('/bkash/callback', bkashCallback);

/**
 * @desc    SSLCommerz Success/Fail/Cancel
 */
router.post('/ssl/success', sslSuccess);
router.post('/ssl/fail', (req, res) => res.redirect(`${process.env.FRONTEND_URL}/payment/failed`));
router.post('/ssl/cancel', (req, res) => res.redirect(`${process.env.FRONTEND_URL}/payment/cancelled`));

// Simple ping for health check
router.get('/status', (req, res) => res.json({ status: 'Payment gateway service is active' }));

module.exports = router;
